import { useEffect } from 'react';

import { Heading, Spinner } from '@douglasneuroinformatics/libui/components';
import { useNotificationsStore, useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { InstrumentRenderer } from '@opendatacapture/react-core';
import type { InstrumentSubmitHandler } from '@opendatacapture/react-core';
import type { UnilingualInstrumentInfo } from '@opendatacapture/schemas/instrument';
import type { CreateInstrumentRecordData } from '@opendatacapture/schemas/instrument-records';
import { createFileRoute, useLocation, useNavigate } from '@tanstack/react-router';
import axios from 'axios';

import { PageHeader } from '@/components/PageHeader';
import { useInstrumentBundle } from '@/hooks/useInstrumentBundle';
import { useInstrumentRecords } from '@/hooks/useInstrumentRecords';
import { useAppStore } from '@/store';

const RouteComponent = () => {
  const currentGroup = useAppStore((store) => store.currentGroup);
  const currentSession = useAppStore((store) => store.currentSession);

  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const notifications = useNotificationsStore();
  const location = useLocation();
  const { t } = useTranslation();

  const info = location.state.info as UnilingualInstrumentInfo;
  const initialData = (location.state as any)?.initialData as Record<string, unknown> | undefined;
  // Fallback to state recordId if search param is missing (e.g. navigation timing issues)
  const recordId = search.recordId ?? ((location.state as any)?.recordId as string | undefined);

  const recordsQuery = useInstrumentRecords({
    // Enable fetching if we have a recordId but no valid initial data
    enabled: Boolean(recordId) && (!initialData || Object.keys(initialData).length === 0),
    params: {
      instrumentId: params.id,
      // When fetching a specific record for editing, strict filtering by group might be too restrictive if admin?
      // But for safety, keep group context.
      groupId: currentGroup?.id
    }
  });

  const fetchedRecord = recordsQuery.data?.find((r) => r.id === recordId);
  const effectiveInitialData =
    initialData && Object.keys(initialData).length > 0
      ? initialData
      : (fetchedRecord?.data as Record<string, unknown> | undefined);

  const instrumentBundleQuery = useInstrumentBundle(params.id);

  const title = info?.clientDetails?.title ?? info?.details.title;

  const isLoadingData = Boolean(recordId) && !effectiveInitialData && recordsQuery.isLoading;

  useEffect(() => {
    // If we have a recordId, we are editing, so we don't need a session
    // If we don't have a recordId AND don't have a session, we shouldn't be here
    if (!currentSession?.id && !recordId) {
      // extra check to ensure we don't redirect if we actually have the params in the URL but hooks haven't updated
      const urlParams = new URLSearchParams(window.location.search);
      if (!urlParams.get('recordId')) {
        void navigate({ to: '/instruments/accessible-instruments' });
      }
    }
  }, [currentSession?.id, recordId]);

  const handleSubmit: InstrumentSubmitHandler = async ({ data, instrumentId }) => {
    if (recordId) {
      await axios.patch(`/v1/instrument-records/${recordId}`, {
        data
      });
    } else {
      await axios.post('/v1/instrument-records', {
        data,
        date: new Date(),
        groupId: currentGroup?.id,
        instrumentId,
        sessionId: currentSession!.id,
        subjectId: currentSession!.subject.id
      } satisfies CreateInstrumentRecordData);
    }
    notifications.addNotification({
      message: t({
        en: 'Formulari desat correctament',
        fr: 'Formulario guardado correctamente'
      } as any),
      type: 'success'
    });
  };

  if (!instrumentBundleQuery.data || isLoadingData) {
    return <Spinner />;
  }

  return (
    <div className="flex grow flex-col">
      <PageHeader>
        <Heading className="text-center" variant="h2">
          {title ?? t('core.instrument')}
        </Heading>
      </PageHeader>
      <div className="grow">
        <InstrumentRenderer
          className="mx-auto max-w-3xl"
          initialData={effectiveInitialData}
          isResuming={Boolean(recordId) || Boolean(effectiveInitialData)}
          subject={currentSession?.subject}
          target={instrumentBundleQuery.data}
          onSubmit={handleSubmit}
        />
      </div>
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
