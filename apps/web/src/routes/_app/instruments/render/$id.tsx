import { useCallback, useEffect, useRef, useState } from 'react';

import { Button, Dialog, Heading, Spinner } from '@douglasneuroinformatics/libui/components';
import { useNotificationsStore, useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { InstrumentRenderer } from '@opendatacapture/react-core';
import type { InstrumentSubmitHandler } from '@opendatacapture/react-core';
import type { CreateInstrumentRecordData } from '@opendatacapture/schemas/instrument-records';
import { createFileRoute, useLocation, useNavigate } from '@tanstack/react-router';
import axios from 'axios';
import { Save } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { useInstrumentBundle } from '@/hooks/useInstrumentBundle';
import { useInstrumentRecords } from '@/hooks/useInstrumentRecords';
import { useAppStore } from '@/store';

const HOSPITAL_META_SEPARATOR = '|||';

function formatHospitalLabel(raw: string) {
  if (raw.includes(HOSPITAL_META_SEPARATOR)) {
    const [name, locality, province] = raw.split(HOSPITAL_META_SEPARATOR).map((value) => value.trim());
    if (locality && province) {
      return `${name}, ${locality} (${province})`;
    }
    const location = locality || province;
    return location ? `${name}, ${location}` : name;
  }
  return raw.trim();
}

function buildGroupHospitalOptions(hospitals: string[]): string {
  const normalized = Array.from(new Set(hospitals.map((hospital) => hospital.trim()).filter(Boolean)));
  const optionsObject = Object.fromEntries(normalized.map((hospital) => [hospital, formatHospitalLabel(hospital)]));
  return JSON.stringify(optionsObject);
}

const DRAFT_PREFIX = 'instrument-draft:';

function getDraftKey(instrumentId: string): string {
  const username = useAppStore.getState().currentUser?.username ?? 'anonymous';
  return `${DRAFT_PREFIX}${instrumentId}:${username}`;
}

function loadDraft(instrumentId: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(getDraftKey(instrumentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: Record<string, unknown>; timestamp: number };
    // Discard drafts older than 7 days
    if (Date.now() - parsed.timestamp > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(getDraftKey(instrumentId));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function saveDraft(instrumentId: string, data: Record<string, unknown>): void {
  try {
    localStorage.setItem(getDraftKey(instrumentId), JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function clearDraft(instrumentId: string): void {
  localStorage.removeItem(getDraftKey(instrumentId));
}

const RouteComponent = () => {
  const currentGroup = useAppStore((store) => store.currentGroup);
  const currentSession = useAppStore((store) => store.currentSession);

  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const notifications = useNotificationsStore();
  const location = useLocation();
  const { t } = useTranslation();

  const instrumentTitle = (location.state as any)?.instrumentTitle as string | undefined;
  const initialData = (location.state as any)?.initialData as Record<string, unknown> | undefined;
  // Fallback to state recordId if search param is missing (e.g. navigation timing issues)
  const recordId = search.recordId ?? ((location.state as any)?.recordId as string | undefined);

  // Draft management
  const [draftData, setDraftData] = useState<Record<string, unknown> | null>(() => {
    // Only load draft for new records (not when editing existing ones)
    if (recordId) return null;
    return loadDraft(params.id);
  });
  const [draftDiscarded, setDraftDiscarded] = useState(false);
  const latestDataRef = useRef<Record<string, unknown> | null>(null);
  // Key to force InstrumentRenderer remount when discarding draft
  const [rendererKey, setRendererKey] = useState(0);
  // Track which step the InstrumentRenderer is on (0=overview, 1=form, 2=summary)
  const [currentStep, setCurrentStep] = useState(0);
  // Edit confirmation dialog state
  const [showEditConfirmation, setShowEditConfirmation] = useState(false);
  const pendingSubmitRef = useRef<{ data: unknown; instrumentId: string } | null>(null);

  const recordsQuery = useInstrumentRecords({
    // Enable fetching if we have a recordId but no valid initial data
    enabled: Boolean(recordId) && (!initialData || Object.keys(initialData).length === 0),
    params: {
      instrumentId: params.id,
      groupId: currentGroup?.id
    }
  });

  const fetchedRecord = recordsQuery.data?.find((r) => r.id === recordId);
  const effectiveInitialData =
    initialData && Object.keys(initialData).length > 0
      ? initialData
      : recordId
        ? (fetchedRecord?.data as Record<string, unknown> | undefined)
        : draftDiscarded
          ? undefined
          : (draftData ?? undefined);

  const instrumentBundleQuery = useInstrumentBundle(params.id);
  const groupHospitalOptions = buildGroupHospitalOptions(currentGroup?.hospitals ?? []);

  const instrumentTarget =
    instrumentBundleQuery.data && instrumentBundleQuery.data.kind !== 'SERIES'
      ? {
          ...instrumentBundleQuery.data,
          // IMPORTANT: `evaluateInstrument` wraps this string with `return ${bundle}`.
          // Any bare assignment prepended here becomes `return X = Y`, which returns Y
          // and skips the instrument IIFE. Wrap in an arrow so the IIFE is what gets returned.
          bundle: `(()=>{globalThis.__ODC_GROUP_HOSPITAL_OPTIONS__ = ${groupHospitalOptions}; return ${instrumentBundleQuery.data.bundle}})()`
        }
      : instrumentBundleQuery.data;

  const title = instrumentTitle;

  const isLoadingData = Boolean(recordId) && !effectiveInitialData && recordsQuery.isLoading;

  // Auto-save form data to localStorage as draft
  const handleDataChange = useCallback(
    (data: Record<string, unknown>) => {
      latestDataRef.current = data;
      // Only auto-save for new records, not when editing existing ones
      if (!recordId) {
        saveDraft(params.id, data);
      }
    },
    [params.id, recordId]
  );

  // Discard draft and restart form
  const handleDiscardDraft = useCallback(() => {
    clearDraft(params.id);
    setDraftData(null);
    setDraftDiscarded(true);
    latestDataRef.current = null;
    setRendererKey((k) => k + 1);
    setCurrentStep(0);
    notifications.addNotification({
      message: t({
        en: 'Esborrany descartat. Formulari reiniciat.',
        fr: 'Borrador descartado. Formulario reiniciado.'
      } as any),
      type: 'info'
    });
  }, [params.id, notifications, t]);

  // Save draft
  const handleSaveDraft = useCallback(() => {
    if (latestDataRef.current && !recordId) {
      saveDraft(params.id, latestDataRef.current);
      notifications.addNotification({
        message: t({
          en: 'Esborrany desat correctament',
          fr: 'Borrador guardado correctamente'
        } as any),
        type: 'success'
      });
    }
  }, [params.id, recordId, notifications, t]);

  // Auto-save draft when session expires
  useEffect(() => {
    const handleSessionExpiring = () => {
      if (latestDataRef.current && !recordId) {
        saveDraft(params.id, latestDataRef.current);
      }
    };
    window.addEventListener('session-expiring', handleSessionExpiring);
    return () => window.removeEventListener('session-expiring', handleSessionExpiring);
  }, [params.id, recordId]);

  useEffect(() => {
    // If we have a recordId, we are editing, so we don't need a session
    if (!currentSession?.id && !recordId) {
      const urlParams = new URLSearchParams(window.location.search);
      if (!urlParams.get('recordId')) {
        void navigate({ to: '/instruments/accessible-instruments' });
      }
    }
  }, [currentSession?.id, recordId]);

  const handleSubmit: InstrumentSubmitHandler = async ({ data, instrumentId }) => {
    if (recordId) {
      // For edits, show confirmation dialog first
      pendingSubmitRef.current = { data, instrumentId };
      setShowEditConfirmation(true);
      return;
    }
    await axios.post('/v1/instrument-records', {
      data,
      date: new Date(),
      groupId: currentGroup?.id,
      instrumentId,
      sessionId: currentSession!.id,
      subjectId: currentSession!.subject.id
    } satisfies CreateInstrumentRecordData);
    // Clear draft on successful submit
    clearDraft(params.id);
    notifications.addNotification({
      message: t({
        en: 'Formulari desat correctament',
        fr: 'Formulario guardado correctamente'
      } as any),
      type: 'success'
    });
  };

  const handleConfirmEdit = async () => {
    if (!pendingSubmitRef.current || !recordId) return;
    try {
      await axios.patch(`/v1/instrument-records/${recordId}`, {
        data: pendingSubmitRef.current.data
      });
      notifications.addNotification({
        message: t({
          en: 'Registre actualitzat correctament. Els canvis han quedat registrats.',
          fr: 'Registro actualizado correctamente. Los cambios han quedado registrados.'
        } as any),
        type: 'success'
      });
    } catch {
      notifications.addNotification({
        message: t({
          en: 'Error en actualitzar el registre',
          fr: 'Error al actualizar el registro'
        } as any),
        type: 'error'
      });
    } finally {
      setShowEditConfirmation(false);
      pendingSubmitRef.current = null;
    }
  };

  if (!instrumentTarget || isLoadingData) {
    if (instrumentBundleQuery.isError) {
      return (
        <div className="flex grow items-center justify-center px-6">
          <p className="text-muted-foreground text-center text-sm">
            {t({
              en: "No s'ha pogut carregar l'instrument. Torna-ho a provar en uns segons.",
              fr: 'No se pudo cargar el instrumento. Inténtelo de nuevo en unos segundos.'
            } as any)}
          </p>
        </div>
      );
    }
    return <Spinner />;
  }

  return (
    <div className="flex grow flex-col">
      {currentStep === 1 && !recordId && (
        <div className="sticky top-0 z-20 flex justify-center border-b bg-white/90 py-2 backdrop-blur-sm dark:bg-slate-900/90">
          <Button className="gap-2" size="sm" variant="outline" onClick={handleSaveDraft}>
            <Save className="h-4 w-4" />
            {t({
              en: 'Desar esborrany',
              fr: 'Guardar borrador'
            } as any)}
          </Button>
        </div>
      )}
      <PageHeader>
        <Heading className="text-center" variant="h2">
          {title ?? t('core.instrument')}
        </Heading>
      </PageHeader>
      <div className="grow">
        <InstrumentRenderer
          key={rendererKey}
          className="mx-auto max-w-3xl"
          initialData={effectiveInitialData}
          isEditing={Boolean(recordId)}
          isResuming={Boolean(recordId) || Boolean(effectiveInitialData)}
          subject={currentSession?.subject}
          target={instrumentTarget}
          onDataChange={handleDataChange}
          onDiscardDraft={draftData && !recordId && !draftDiscarded ? handleDiscardDraft : undefined}
          onStepChange={setCurrentStep}
          onSubmit={handleSubmit}
        />
      </div>
      {/* Edit confirmation dialog */}
      <Dialog open={showEditConfirmation} onOpenChange={setShowEditConfirmation}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>
              {t({
                en: 'Confirmar modificació',
                fr: 'Confirmar modificación'
              } as any)}
            </Dialog.Title>
            <Dialog.Description>
              {t({
                en: 'Està a punt de modificar un registre mèdic. Tots els canvis quedaran registrats amb traçabilitat completa (camps modificats, valors anteriors i nous, data i usuari). Voleu continuar?',
                fr: 'Está a punto de modificar un registro médico. Todos los cambios quedarán registrados con trazabilidad completa (campos modificados, valores anteriores y nuevos, fecha y usuario). ¿Desea continuar?'
              } as any)}
            </Dialog.Description>
          </Dialog.Header>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditConfirmation(false);
                pendingSubmitRef.current = null;
              }}
            >
              {t({
                en: 'Cancel·lar',
                fr: 'Cancelar'
              } as any)}
            </Button>
            <Button variant="primary" onClick={() => void handleConfirmEdit()}>
              {t({
                en: 'Confirmar i desar',
                fr: 'Confirmar y guardar'
              } as any)}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog>
    </div>
  );
};

export const Route = createFileRoute('/_app/instruments/render/$id')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      recordId: search.recordId as string | undefined
    };
  }
});
