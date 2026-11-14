import React, { useEffect, useRef } from 'react';

import { Button, Heading } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { isOrionPatientCode } from '@opendatacapture/schemas/instrument-records';
import { getInstrumentStudyCode } from '@opendatacapture/schemas/group';
import { canOpenTheraVisit, getTheraVisit, THERA_VISIT_ORDER } from '@opendatacapture/schemas/thera';
import { encodeScopedSubjectId } from '@opendatacapture/subject-utils';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { InstrumentShowcase } from '@/components/InstrumentShowcase';
import { PageHeader } from '@/components/PageHeader';
import { WithFallback } from '@/components/WithFallback';
import { useInstrumentInfoQuery } from '@/hooks/useInstrumentInfoQuery';
import { useInstrumentRecords } from '@/hooks/useInstrumentRecords';
import { useCreateSessionMutation } from '@/hooks/useCreateSessionMutation';
import { useAppStore } from '@/store';
import { getTheraStoredVisits } from '@/utils/thera-datahub';

const ORION_SELECTION_INTERNAL_NAME = 'ORION_PR_2026_SELECTION';
const ORION_FOLLOWUP_INTERNAL_NAME = 'ORION_PR_2026_FOLLOWUP';
const LAST_INSTRUMENT_PREFIX = 'last-instrument:';

function getLastInstrumentKey(sessionId: string) {
  return `${LAST_INSTRUMENT_PREFIX}${sessionId}`;
}

function loadLastInstrumentId(sessionId: string): string | null {
  try {
    return localStorage.getItem(getLastInstrumentKey(sessionId));
  } catch {
    return null;
  }
}

function saveLastInstrumentId(sessionId: string, instrumentId: string) {
  try {
    localStorage.setItem(getLastInstrumentKey(sessionId), instrumentId);
  } catch {
    // Ignore unavailable browser storage; the session can still continue normally.
  }
}

const RouteComponent = () => {
  const currentSession = useAppStore((store) => store.currentSession);
  const currentUser = useAppStore((store) => store.currentUser);
  const currentGroup = useAppStore((store) => store.currentGroup);
  const changeGroup = useAppStore((store) => store.changeGroup);
  const startSession = useAppStore((store) => store.startSession);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const createSessionMutation = useCreateSessionMutation();
  const instrumentInfoQuery = useInstrumentInfoQuery();
  const hasRestoredLastInstrument = useRef(false);
  const selectedGroup = currentGroup ?? currentUser?.groups[0] ?? null;
  const isAdmin = currentUser?.basePermissionLevel === 'ADMIN';
  const accessibleInstrumentIds = new Set(selectedGroup?.accessibleInstrumentIds ?? []);
  const orionSelectionInstrumentId = (instrumentInfoQuery.data ?? [])
    .filter((instrument) => instrument.internal?.name === ORION_SELECTION_INTERNAL_NAME)
    .sort((first, second) => (second.internal?.edition ?? 0) - (first.internal?.edition ?? 0))[0]?.id;
  const scopedSubjectId =
    currentUser && selectedGroup
      ? encodeScopedSubjectId(currentUser.username, { groupName: selectedGroup.name })
      : undefined;
  const orionSelectionRecordsQuery = useInstrumentRecords({
    enabled: Boolean(orionSelectionInstrumentId && scopedSubjectId),
    params: {
      groupId: selectedGroup?.id,
      instrumentId: orionSelectionInstrumentId,
      subjectId: scopedSubjectId
    }
  });
  const orionFollowupRecordsQuery = useInstrumentRecords({
    enabled: Boolean(selectedGroup?.id && scopedSubjectId),
    params: {
      groupId: selectedGroup?.id,
      instrumentName: ORION_FOLLOWUP_INTERNAL_NAME,
      subjectId: scopedSubjectId
    }
  });
  const completedOrionFollowupCodes = new Set(
    (orionFollowupRecordsQuery.data ?? [])
      .map((record) => {
        const data = record.data as Record<string, unknown>;
        const patientCode = data.patient_code ?? data.user_code;
        return isOrionPatientCode(patientCode) ? patientCode.trim() : undefined;
      })
      .filter((patientCode): patientCode is string => Boolean(patientCode))
  );
  const hasPendingOrionFollowup =
    Boolean(orionSelectionRecordsQuery.data && orionFollowupRecordsQuery.data) &&
    (orionSelectionRecordsQuery.data ?? []).some((record) => {
      const data = record.data as Record<string, unknown>;
      const patientCode = data.patient_code ?? data.user_code;
      return (
        typeof patientCode === 'string' &&
        isOrionPatientCode(patientCode) &&
        Boolean(data.selection_visit_date) &&
        !completedOrionFollowupCodes.has(patientCode.trim())
      );
    });
  const hasTheraInstruments = (instrumentInfoQuery.data ?? []).some(
    (instrument) =>
      accessibleInstrumentIds.has(instrument.id) &&
      Boolean(instrument.internal && getTheraVisit(instrument.internal.name))
  );
  const theraRecordsQuery = useInstrumentRecords({
    enabled: !isAdmin && hasTheraInstruments && Boolean(selectedGroup?.id && scopedSubjectId),
    params: { groupId: selectedGroup?.id, subjectId: scopedSubjectId },
    throwOnError: false
  });
  const theraRecords = getTheraStoredVisits(theraRecordsQuery.data ?? [], instrumentInfoQuery.data ?? []);
  const availableTheraVisits = new Set(
    THERA_VISIT_ORDER.filter(
      (visit) =>
        visit === 'V0' ||
        theraRecords.some(
          (record) =>
            record.visit === 'V0' &&
            typeof record.data.patient_code === 'string' &&
            canOpenTheraVisit(visit, theraRecords, record.data.patient_code)
        )
    )
  );
  const availableInstruments = instrumentInfoQuery.data?.filter((instrument) => {
    if (!accessibleInstrumentIds.has(instrument.id)) return false;
    const studyCode = instrument.internal && getInstrumentStudyCode(instrument.internal.name);
    if (studyCode && selectedGroup?.studyCode && studyCode !== selectedGroup.studyCode) return false;
    if (isAdmin) return true;
    if (instrument.internal?.name === ORION_FOLLOWUP_INTERNAL_NAME) return hasPendingOrionFollowup;
    const visit = instrument.internal && getTheraVisit(instrument.internal.name);
    return !visit || (!theraRecordsQuery.isError && availableTheraVisits.has(visit)) || visit === 'V0';
  });

  useEffect(() => {
    if (hasRestoredLastInstrument.current || !currentSession || !instrumentInfoQuery.data) {
      return;
    }

    const lastInstrumentId = loadLastInstrumentId(currentSession.id);
    if (!lastInstrumentId || !accessibleInstrumentIds.has(lastInstrumentId)) {
      hasRestoredLastInstrument.current = true;
      return;
    }

    const instrument = instrumentInfoQuery.data.find((entry) => entry.id === lastInstrumentId);
    const theraVisit = instrument?.internal && getTheraVisit(instrument.internal.name);
    if (!isAdmin && theraVisit && theraVisit !== 'V0' && theraRecordsQuery.data === undefined) return;
    if (
      !isAdmin &&
      instrument?.internal?.name === ORION_FOLLOWUP_INTERNAL_NAME &&
      (orionSelectionRecordsQuery.data === undefined || orionFollowupRecordsQuery.data === undefined)
    )
      return;
    hasRestoredLastInstrument.current = true;
    if (!instrument || !availableInstruments?.some((entry) => entry.id === instrument.id)) {
      return;
    }

    void navigate({
      params: { id: instrument.id },
      search: { recordId: undefined },
      state: { instrumentTitle: instrument.details.title },
      to: `/instruments/render/$id`
    });
  }, [
    accessibleInstrumentIds,
    availableInstruments,
    currentSession,
    instrumentInfoQuery.data,
    isAdmin,
    navigate,
    orionFollowupRecordsQuery.data,
    orionSelectionRecordsQuery.data,
    theraRecordsQuery.data
  ]);

  return (
    <div data-testid="accessible-instruments-page">
      <PageHeader>
        <Heading className="text-center" variant="h2">
          {t('instruments.accessible.title')}
        </Heading>
      </PageHeader>
      {!isAdmin && hasTheraInstruments && theraRecordsQuery.isError ? (
        <div role="alert">
          <p>
            {t({
              en: 'No s’han pogut comprovar les visites THERA guardades. Els seguiments es desbloquejaran quan es recuperin les dades.',
              fr: 'No se han podido comprobar las visitas THERA guardadas. Los seguimientos se desbloquearán cuando se recuperen los datos.'
            })}
          </p>
          <Button onClick={() => void theraRecordsQuery.refetch()}>
            {t({ en: 'Torna-ho a provar', fr: 'Volver a intentar' })}
          </Button>
        </div>
      ) : null}
      <WithFallback
        Component={InstrumentShowcase}
        props={{
          data: availableInstruments,
          onSelect: (instrument) => {
            void (async () => {
              if (!currentUser || !selectedGroup) return;
              if (!currentSession) {
                const session = await createSessionMutation.mutateAsync({
                  date: new Date(),
                  groupId: selectedGroup.id,
                  subjectData: {
                    id: encodeScopedSubjectId(currentUser.username, { groupName: selectedGroup.name })
                  },
                  type: 'RETROSPECTIVE',
                  username: currentUser.username
                });
                startSession({ ...session, type: 'RETROSPECTIVE' });
                saveLastInstrumentId(session.id, instrument.id);
              } else {
                saveLastInstrumentId(currentSession.id, instrument.id);
              }
              await navigate({
                params: { id: instrument.id },
                search: { recordId: undefined },
                state: { instrumentTitle: instrument.details.title },
                to: `/instruments/render/$id`
              });
            })();
          },
          groups: currentUser?.groups,
          isAdmin,
          onGroupChange: (groupId) => {
            const group = currentUser?.groups.find((entry) => entry.id === groupId);
            if (group) {
              changeGroup(group);
            }
          },
          selectedGroupId: selectedGroup?.id
        }}
      />
    </div>
  );
};

export const Route = createFileRoute('/_app/instruments/accessible-instruments')({
  component: RouteComponent
});
