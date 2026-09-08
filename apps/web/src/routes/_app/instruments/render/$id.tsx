import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';

import { Button, Dialog, Heading, Spinner } from '@douglasneuroinformatics/libui/components';
import { useNotificationsStore, useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { InstrumentRenderer } from '@opendatacapture/react-core';
import type { InstrumentSubmitHandler } from '@opendatacapture/react-core';
import type { CreateInstrumentRecordData } from '@opendatacapture/schemas/instrument-records';
import { encodeScopedSubjectId } from '@opendatacapture/subject-utils';
import { createFileRoute, useLocation, useNavigate } from '@tanstack/react-router';
import axios from 'axios';
import { Save } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { useInstrumentBundle } from '@/hooks/useInstrumentBundle';
import { useInstrumentInfoQuery } from '@/hooks/useInstrumentInfoQuery';
import { useInstrumentRecords } from '@/hooks/useInstrumentRecords';
import { useAppStore } from '@/store';

const HOSPITAL_META_SEPARATOR = '|||';
const ORION_SELECTION_INTERNAL_NAME = 'ORION_PR_2026_SELECTION';
const ORION_FOLLOWUP_INTERNAL_NAME = 'ORION_PR_2026_FOLLOWUP';
const ORION_DATE_MIN = new Date(2026, 11, 1, 0, 0, 0, 0);
const ORION_DATE_MAX = new Date(2027, 11, 31, 23, 59, 59, 999);
const ORION_AGE_MIN = 18;
const ORION_AGE_MAX = 120;
const ORION_WEIGHT_MIN = 30;
const ORION_WEIGHT_MAX = 250;
const ORION_HEIGHT_MIN = 120;
const ORION_HEIGHT_MAX = 230;

type OrionLiveValidationError = {
  field: string;
  message: string;
};

function parseOrionDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
    if (ddmmyyyy) {
      const day = Number(ddmmyyyy[1]);
      const month = Number(ddmmyyyy[2]);
      const year = Number(ddmmyyyy[3]);
      const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
      if (
        Number.isNaN(parsed.getTime()) ||
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day
      ) {
        return null;
      }
      return parsed;
    }

    const isoCandidate = new Date(trimmed);
    if (!Number.isNaN(isoCandidate.getTime())) {
      return isoCandidate;
    }

    const isoDateLike = /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.exec(trimmed);
    if (isoDateLike) {
      const parsed = new Date(`${trimmed}T12:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  }

  return null;
}

function isCompleteDateEntry(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length >= 10;
}

function normalizeOrionBundle(bundle: string, mode: 'followup' | 'selection'): string {
  let patched = bundle;

  // Remove investigator initials from ORION forms.
  patched = patched.replace(
    /professional_initials:requiresEligibility\(\{kind:"string",variant:"input",label:"Iniciales \*"\}\),?/g,
    ''
  );
  patched = patched.replace(
    /professional_initials:\{kind:"string",label:"Iniciales del profesional sanitario que ha rellenado los datos",variant:"input"\},?/g,
    ''
  );
  patched = patched.replace(/professional_initials:z\.string\(\)\.min\(1,"Este campo es obligatorio"\),?/g, '');
  patched = patched.replace(/professional_initials:z\.string\(\)\.optional\(\),?/g, '');
  patched = patched.replace(/,"professional_initials"/g, '');

  if (mode === 'selection') {
    patched = patched.replace(
      /user_code:\{kind:"string",label:"[^"]*",variant:"input"\}/,
      'user_code:{kind:"string",label:"Código del paciente",variant:"input",disabled:true}'
    );

    // Add visit/consent dates near informed consent section.
    patched = patched.replace(
      /informed_consent:\{kind:"string",label:"[^"]*",variant:"radio",options:YES_NO_OPTIONS\}/,
      'informed_consent:{kind:"string",label:"¿El paciente ha firmado el consentimiento informado? *",variant:"radio",options:YES_NO_OPTIONS},selection_visit_date:requiresConsent({...dateField("Fecha de la visita de selección *")}),consent_signed_date:requiresConsent({...dateField("Fecha de firma del consentimiento informado *")})'
    );
    patched = patched.replace(
      'informed_consent:z.enum(["si","no"]),',
      'informed_consent:z.enum(["si","no"]),selection_visit_date:optionalManualDateSchema(),consent_signed_date:optionalManualDateSchema(),'
    );

    // Singular phrasing for inclusion criteria.
    patched = patched.replace(
      'Pacientes con diagnóstico de dolor neuropático (periférico o central) documentado en su historia clínica',
      'El paciente tiene diagnóstico de dolor neuropático (periférico o central) documentado en su historia clínica'
    );
    patched = patched.replace(
      'Pacientes previamente tratados con pregabalina de liberación inmediata (IR) antes de iniciar tratamiento con pregabalina de liberación prolongada (PR)',
      'El paciente está previamente tratado con pregabalina de liberación inmediata (IR) antes de iniciar tratamiento con pregabalina de liberación prolongada (PR)'
    );
    patched = patched.replace(
      'Pacientes que hayan estado en tratamiento con pregabalina PR durante al menos 3 meses y hasta 6 meses',
      'El paciente ha estado en tratamiento con pregabalina PR durante al menos 3 meses y hasta 6 meses'
    );
    patched = patched.replace(
      'Pacientes que hayan recibido pregabalina PR durante al menos el último mes a una dosis terapéutica (165-660 mg), aunque el tratamiento puede haber comenzado con dosis inferiores en la práctica clínica habitual antes de la titulación a 165 mg o superior',
      'El paciente ha recibido pregabalina PR durante al menos el último mes a una dosis terapéutica (165-660 mg), aunque el tratamiento puede haber comenzado con dosis inferiores en la práctica clínica habitual antes de la titulación a 165 mg o superior'
    );
    patched = patched.replace(
      'Pacientes ≥ 18 años en el momento de la inclusión',
      'El paciente es ≥ 18 años en el momento de la inclusión'
    );
    patched = patched.replace(
      'Pacientes que hayan proporcionado consentimiento informado por escrito',
      'El paciente ha proporcionado consentimiento informado por escrito'
    );
  }

  return patched;
}

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

function getOrionLiveValidationErrors(data: Record<string, unknown>): OrionLiveValidationError[] {
  const errors: OrionLiveValidationError[] = [];

  const addNumberError = (field: string, value: unknown, min: number, max: number, message: string) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number) || number < min || number > max) {
      errors.push({ field, message });
    }
  };

  addNumberError(
    'age',
    data.age,
    ORION_AGE_MIN,
    ORION_AGE_MAX,
    `La edad indicada no es válida para este estudio. Debe estar entre ${ORION_AGE_MIN} y ${ORION_AGE_MAX} años.`
  );
  addNumberError(
    'weight',
    data.weight,
    ORION_WEIGHT_MIN,
    ORION_WEIGHT_MAX,
    `El peso indicado está fuera del rango razonable (${ORION_WEIGHT_MIN}-${ORION_WEIGHT_MAX} kg). Revise el dato antes de continuar.`
  );
  addNumberError(
    'height',
    data.height,
    ORION_HEIGHT_MIN,
    ORION_HEIGHT_MAX,
    `La altura indicada está fuera del rango razonable (${ORION_HEIGHT_MIN}-${ORION_HEIGHT_MAX} cm). Revise el dato antes de continuar.`
  );

  const selectionVisitDate = parseOrionDate(data.selection_visit_date);
  if (
    isCompleteDateEntry(data.selection_visit_date) &&
    (!selectionVisitDate || selectionVisitDate < ORION_DATE_MIN || selectionVisitDate > ORION_DATE_MAX)
  ) {
    errors.push({
      field: 'selection_visit_date',
      message: 'La fecha de la visita de selección debe estar entre diciembre de 2026 y diciembre de 2027.'
    });
  }

  const consentSignedDate = parseOrionDate(data.consent_signed_date);
  if (
    isCompleteDateEntry(data.consent_signed_date) &&
    (!consentSignedDate || consentSignedDate < ORION_DATE_MIN || consentSignedDate > ORION_DATE_MAX)
  ) {
    errors.push({
      field: 'consent_signed_date',
      message: 'La fecha de firma del consentimiento debe estar entre diciembre de 2026 y diciembre de 2027.'
    });
  }

  if (selectionVisitDate && consentSignedDate && consentSignedDate > selectionVisitDate) {
    errors.push({
      field: 'consent_signed_date',
      message: 'La fecha de firma del consentimiento no puede ser posterior a la visita de selección.'
    });
  }

  for (const prefix of ['retro', 'prosp', 'followup'] as const) {
    addNumberError(
      `${prefix}_eq5d_vas`,
      data[`${prefix}_eq5d_vas`],
      0,
      100,
      'La valoración del estado de salud debe estar entre 0 y 100.'
    );
  }

  return errors.filter(
    (error, index) => errors.findIndex((candidate) => candidate.message === error.message) === index
  );
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
  const currentUser = useAppStore((store) => store.currentUser);
  const endSession = useAppStore((store) => store.endSession);

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
  const [liveValidationErrors, setLiveValidationErrors] = useState<OrionLiveValidationError[]>([]);
  const [orionTouchedFields, setOrionTouchedFields] = useState<Set<string>>(new Set());
  const [reservedOrionPatientCode, setReservedOrionPatientCode] = useState<string | null>(null);
  const [orionPatientCodeReservationFailed, setOrionPatientCodeReservationFailed] = useState(false);

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
  const instrumentInfoQuery = useInstrumentInfoQuery();
  const groupHospitalOptions = buildGroupHospitalOptions(currentGroup?.hospitals ?? []);

  const instrumentInfo = (instrumentInfoQuery.data ?? []).find((instrument) => instrument.id === params.id);
  const orionSelectionInstrumentId = (instrumentInfoQuery.data ?? []).find(
    (instrument) => instrument.internal?.name === ORION_SELECTION_INTERNAL_NAME
  )?.id;
  const scopedSubjectId =
    currentSession?.subject.id ??
    (currentUser && currentGroup
      ? encodeScopedSubjectId(currentUser.username, { groupName: currentGroup.name })
      : undefined);

  const isOrionFollowup = instrumentInfo?.internal?.name === ORION_FOLLOWUP_INTERNAL_NAME;
  const isOrionSelection = instrumentInfo?.internal?.name === ORION_SELECTION_INTERNAL_NAME;

  useEffect(() => {
    if (
      !isOrionSelection ||
      recordId ||
      reservedOrionPatientCode ||
      orionPatientCodeReservationFailed ||
      effectiveInitialData?.user_code ||
      !currentGroup?.id
    ) {
      return;
    }

    let cancelled = false;
    void axios
      .post<{ code: string }>('/v1/instrument-records/orion-patient-code', { groupId: currentGroup.id })
      .then(({ data }) => {
        if (!cancelled) {
          setReservedOrionPatientCode(data.code);
          setRendererKey((current) => current + 1);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOrionPatientCodeReservationFailed(true);
          notifications.addNotification({
            message:
              'No se ha podido generar el código del paciente ORION. Revise la asignación de hospital del investigador.',
            type: 'error'
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentGroup?.id,
    effectiveInitialData?.user_code,
    isOrionSelection,
    notifications,
    orionPatientCodeReservationFailed,
    recordId,
    reservedOrionPatientCode
  ]);
  const orionSelectionRecordsQuery = useInstrumentRecords({
    enabled: Boolean(isOrionFollowup && orionSelectionInstrumentId && scopedSubjectId),
    params: {
      groupId: currentGroup?.id,
      instrumentId: orionSelectionInstrumentId,
      subjectId: scopedSubjectId
    }
  });

  const orionFollowupUserCodeOptions = useMemo(() => {
    if (!isOrionFollowup) {
      return {} as Record<string, string>;
    }
    const codes = new Set<string>();
    for (const record of orionSelectionRecordsQuery.data ?? []) {
      const value = (record.data as Record<string, unknown>)?.user_code;
      if (typeof value === 'string' && value.trim().length > 0) {
        codes.add(value.trim());
      }
    }
    return Object.fromEntries(
      Array.from(codes)
        .sort()
        .map((code) => [code, code])
    );
  }, [isOrionFollowup, orionSelectionRecordsQuery.data]);

  const orionFollowupUserCodeOptionsJson = JSON.stringify(orionFollowupUserCodeOptions);

  const instrumentBundleWithOverrides = useMemo(() => {
    if (!instrumentBundleQuery.data || instrumentBundleQuery.data.kind === 'SERIES') {
      return instrumentBundleQuery.data;
    }

    let bundle = instrumentBundleQuery.data.bundle;
    if (isOrionSelection) {
      bundle = normalizeOrionBundle(bundle, 'selection');
    }
    if (isOrionFollowup) {
      bundle = normalizeOrionBundle(bundle, 'followup');
      bundle = bundle.replace(
        /user_code:\{kind:"string",label:"[^"]*",variant:"input"\}/,
        'user_code:{kind:"string",label:"Código del usuario *",variant:"select",options:globalThis.__ODC_ORION_USER_CODE_OPTIONS__}'
      );
    }

    return {
      ...instrumentBundleQuery.data,
      // IMPORTANT: `evaluateInstrument` wraps this string with `return ${bundle}`.
      // Any bare assignment prepended here becomes `return X = Y`, which returns Y
      // and skips the instrument IIFE. Wrap in an arrow so the IIFE is what gets returned.
      bundle: `(()=>{const runtimeCacheBust = globalThis.__ODC_RUNTIME_CACHE_BUST__ ??= Date.now().toString(36); globalThis.__resolveImport = (specifier) => specifier.startsWith('/runtime/') ? specifier + (specifier.includes('?') ? '&' : '?') + 'v=' + runtimeCacheBust : specifier; globalThis.__ODC_GROUP_HOSPITAL_OPTIONS__ = ${groupHospitalOptions}; globalThis.__ODC_ORION_USER_CODE_OPTIONS__ = ${orionFollowupUserCodeOptionsJson}; return ${bundle}})()`
    };
  }, [
    groupHospitalOptions,
    instrumentBundleQuery.data,
    isOrionFollowup,
    isOrionSelection,
    orionFollowupUserCodeOptionsJson
  ]);

  const instrumentTarget = instrumentBundleWithOverrides;
  const formInitialData =
    isOrionSelection && reservedOrionPatientCode && !effectiveInitialData?.user_code
      ? { ...effectiveInitialData, user_code: reservedOrionPatientCode }
      : effectiveInitialData;

  const title = instrumentTitle;

  const isLoadingData = Boolean(recordId) && !effectiveInitialData && recordsQuery.isLoading;
  const isWaitingForOrionPatientCode =
    isOrionSelection &&
    !recordId &&
    !effectiveInitialData?.user_code &&
    !reservedOrionPatientCode &&
    !orionPatientCodeReservationFailed;

  // Auto-save form data to localStorage as draft
  const handleDataChange = useCallback(
    (data: Record<string, unknown>) => {
      latestDataRef.current = data;
      if (isOrionSelection || isOrionFollowup) {
        setLiveValidationErrors(getOrionLiveValidationErrors(data));
      } else {
        setLiveValidationErrors([]);
      }
      // Only auto-save for new records, not when editing existing ones
      if (!recordId) {
        saveDraft(params.id, data);
      }
    },
    [isOrionFollowup, isOrionSelection, params.id, recordId]
  );

  const handleOrionFieldBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (!isOrionSelection && !isOrionFollowup) {
        return;
      }
      const field = event.target;
      if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLSelectElement ||
        field instanceof HTMLTextAreaElement
      ) {
        if (field.name) {
          setOrionTouchedFields((current) => new Set(current).add(field.name));
        }
      }
    },
    [isOrionFollowup, isOrionSelection]
  );

  useEffect(() => {
    document.querySelectorAll('[data-orion-live-error]').forEach((element) => element.remove());

    for (const error of liveValidationErrors.filter((candidate) => orionTouchedFields.has(candidate.field))) {
      const field = document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        `[name="${error.field}"]`
      );
      if (!field) {
        continue;
      }
      const message = document.createElement('p');
      message.className = 'mt-1 text-sm font-medium text-destructive';
      message.dataset.orionLiveError = error.field;
      message.textContent = error.message;
      field.insertAdjacentElement('afterend', message);
    }
  }, [liveValidationErrors, orionTouchedFields]);

  useEffect(() => {
    if (!isOrionSelection || currentStep !== 1) {
      return;
    }

    const styledElements: HTMLElement[] = [];
    const styles = [
      { background: 'rgba(142, 136, 255, 0.08)', border: 'rgba(142, 136, 255, 0.32)', markers: ['PREGABALINA IR'] },
      { background: 'rgba(142, 136, 255, 0.10)', border: 'rgba(142, 136, 255, 0.38)', markers: ['PREGABALINA PR'] },
      {
        background: 'rgba(142, 136, 255, 0.06)',
        border: 'rgba(142, 136, 255, 0.28)',
        markers: ['RETROSPECTIVA', 'PROSPECTIVA', 'CALIDAD DE SUEÑO', 'ADHERENCIA AL TRATAMIENTO']
      }
    ];

    for (const heading of document.querySelectorAll<HTMLElement>('h4')) {
      const sectionText = heading.textContent?.toUpperCase() ?? '';
      const style = styles.find(({ markers }) => markers.some((marker) => sectionText.includes(marker)));
      if (!style) {
        continue;
      }
      const section = heading.closest('.flex.flex-col.gap-6') as HTMLElement | null;
      if (!section || section.dataset.orionTreatmentBand) {
        continue;
      }
      section.dataset.orionTreatmentBand = 'true';
      section.style.backgroundColor = style.background;
      section.style.borderInlineStart = `2px solid ${style.border}`;
      section.style.borderRadius = '8px';
      section.style.padding = '16px';
      styledElements.push(section);
    }

    return () => {
      for (const section of styledElements) {
        section.removeAttribute('data-orion-treatment-band');
        section.removeAttribute('style');
      }
    };
  }, [currentStep, isOrionSelection, rendererKey]);

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
    if (recordId) {
      return;
    }

    if (latestDataRef.current) {
      saveDraft(params.id, latestDataRef.current);
    }

    notifications.addNotification({
      message: t({
        en: 'Esborrany desat. Tornant a seleccionar estudi.',
        fr: 'Borrador guardado. Volviendo a seleccionar estudio.'
      } as any),
      type: 'success'
    });

    endSession();
    void navigate({ to: '/instruments/accessible-instruments' });
  }, [endSession, navigate, notifications, params.id, recordId, t]);

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
    const handleSaveDraftBeforeClose = () => {
      if (latestDataRef.current && !recordId) {
        saveDraft(params.id, latestDataRef.current);
      }
    };

    const handleDiscardDraftBeforeClose = () => {
      if (!recordId) {
        clearDraft(params.id);
      }
    };

    window.addEventListener('odc-save-draft-before-close', handleSaveDraftBeforeClose);
    window.addEventListener('odc-discard-draft-before-close', handleDiscardDraftBeforeClose);
    return () => {
      window.removeEventListener('odc-save-draft-before-close', handleSaveDraftBeforeClose);
      window.removeEventListener('odc-discard-draft-before-close', handleDiscardDraftBeforeClose);
    };
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
    if (isOrionSelection) {
      const values = data as Record<string, unknown>;
      const inclusionKeys = ['inclusion_1', 'inclusion_2', 'inclusion_3', 'inclusion_4', 'inclusion_5', 'inclusion_6'];
      const exclusionKeys = ['exclusion_1', 'exclusion_2', 'exclusion_3', 'exclusion_4', 'exclusion_5', 'exclusion_6'];

      // NOTE: these guards must throw (not return) on failure. The renderer treats a
      // resolved onSubmit promise as a successful save and advances to the summary
      // step, so returning normally here would show "completed" without persisting data.
      const rejectSubmit = (message: string): never => {
        notifications.addNotification({ message, type: 'error' });
        throw new Error(message);
      };

      if (values.informed_consent !== 'si') {
        rejectSubmit('No se puede continuar sin consentimiento informado firmado.');
      }

      const eligible =
        inclusionKeys.every((key) => values[key] === 'si') && exclusionKeys.every((key) => values[key] === 'no');
      if (!eligible) {
        rejectSubmit(
          'No se puede continuar: revise los criterios de inclusión y exclusión (inclusión=SI y exclusión=NO).'
        );
      }

      const age = typeof values.age === 'number' ? values.age : undefined;
      if (typeof age === 'number' && age < 18) {
        rejectSubmit('No se puede continuar: el paciente debe ser mayor de edad (≥ 18 años).');
      }

      const selectionVisitDate = parseOrionDate(values.selection_visit_date);
      const consentSignedDate = parseOrionDate(values.consent_signed_date);
      if (!selectionVisitDate || !consentSignedDate) {
        rejectSubmit('Debe indicar la fecha de visita de selección y la fecha de firma del consentimiento.');
      }

      if (
        selectionVisitDate.getTime() < ORION_DATE_MIN.getTime() ||
        selectionVisitDate.getTime() > ORION_DATE_MAX.getTime() ||
        consentSignedDate.getTime() < ORION_DATE_MIN.getTime() ||
        consentSignedDate.getTime() > ORION_DATE_MAX.getTime()
      ) {
        rejectSubmit('Las fechas deben estar entre diciembre de 2026 y diciembre de 2027.');
      }

      if (consentSignedDate.getTime() > selectionVisitDate.getTime()) {
        rejectSubmit('La firma del consentimiento no puede ser posterior a la visita de selección.');
      }

      for (const prefix of ['prev', 'current', 'concomitant']) {
        for (let treatmentNumber = 1; treatmentNumber <= 4; treatmentNumber++) {
          const startDate = parseOrionDate(values[`${prefix}_treatment_start_${treatmentNumber}`]);
          const endDate = parseOrionDate(values[`${prefix}_treatment_end_${treatmentNumber}`]);
          if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
            rejectSubmit(
              `La fecha de inicio del tratamiento no puede ser posterior a la fecha de fin (tratamiento ${treatmentNumber}).`
            );
          }
        }
      }
    }

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

  if (!instrumentTarget || isLoadingData || isWaitingForOrionPatientCode) {
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
      <PageHeader>
        <Heading className="text-center" variant="h2">
          {title ?? t('core.instrument')}
        </Heading>
      </PageHeader>
      {currentStep === 1 && !recordId ? (
        <div className="fixed right-6 top-6 z-[70]">
          <Button
            className="gap-2 bg-[#8f8df2] text-white shadow-md hover:bg-[#7f7de4]"
            size="sm"
            type="button"
            variant="primary"
            onClick={handleSaveDraft}
          >
            <Save className="h-4 w-4" />
            {t({
              en: 'Desar esborrany',
              fr: 'Guardar borrador'
            } as any)}
          </Button>
        </div>
      ) : null}
      <div className="grow" onBlurCapture={handleOrionFieldBlur}>
        <InstrumentRenderer
          key={rendererKey}
          className="mx-auto max-w-3xl"
          initialData={formInitialData}
          isEditing={Boolean(recordId)}
          isResuming={Boolean(recordId) || Boolean(effectiveInitialData)}
          subject={currentSession?.subject}
          target={instrumentTarget}
          onDataChange={handleDataChange}
          onDiscardDraft={draftData && !recordId && !draftDiscarded ? handleDiscardDraft : undefined}
          onStepChange={setCurrentStep}
          onSubmit={handleSubmit}
          revalidateOnChange={isOrionSelection || isOrionFollowup}
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
