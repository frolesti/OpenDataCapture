import React, { useEffect, useRef } from 'react';

import { Heading } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { encodeScopedSubjectId } from '@opendatacapture/subject-utils';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { InstrumentShowcase } from '@/components/InstrumentShowcase';
import { PageHeader } from '@/components/PageHeader';
import { WithFallback } from '@/components/WithFallback';
import { useInstrumentInfoQuery } from '@/hooks/useInstrumentInfoQuery';
import { useInstrumentRecords } from '@/hooks/useInstrumentRecords';
import { useCreateSessionMutation } from '@/hooks/useCreateSessionMutation';
import { useAppStore } from '@/store';

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
  const accessibleInstrumentIds = new Set(currentUser?.groups.flatMap((group) => group.accessibleInstrumentIds) ?? []);
  const scopedSubjectId =
    currentUser && selectedGroup
      ? encodeScopedSubjectId(currentUser.username, { groupName: selectedGroup.name })
      : undefined;
  const orionSelectionInstrument = (instrumentInfoQuery.data ?? []).find(
    (instrument) => instrument.internal?.name === ORION_SELECTION_INTERNAL_NAME
  );
  const orionSelectionRecordsQuery = useInstrumentRecords({
    enabled: Boolean(scopedSubjectId && orionSelectionInstrument?.id),
    params: {
      groupId: selectedGroup?.id,
      instrumentId: orionSelectionInstrument?.id,
      subjectId: scopedSubjectId
    }
  });
  const hasOrionSelectionWithUserCode = (orionSelectionRecordsQuery.data ?? []).some((record) => {
    const data = record.data as Record<string, unknown>;
    return typeof data.user_code === 'string' && data.user_code.trim().length > 0;
  });

  useEffect(() => {
    if (hasRestoredLastInstrument.current || !currentSession || !instrumentInfoQuery.data) {
      return;
    }

    hasRestoredLastInstrument.current = true;
    const lastInstrumentId = loadLastInstrumentId(currentSession.id);
    if (!lastInstrumentId || !accessibleInstrumentIds.has(lastInstrumentId)) {
      return;
    }

    const instrument = instrumentInfoQuery.data.find((entry) => entry.id === lastInstrumentId);
    if (!instrument || (instrument.internal?.name === ORION_FOLLOWUP_INTERNAL_NAME && !hasOrionSelectionWithUserCode)) {
      return;
    }

    void navigate({
      params: { id: instrument.id },
      search: { recordId: undefined },
      state: { instrumentTitle: instrument.details.title },
      to: `/instruments/render/$id`
    });
  }, [accessibleInstrumentIds, currentSession, hasOrionSelectionWithUserCode, instrumentInfoQuery.data, navigate]);

  return (
    <div data-testid="accessible-instruments-page">
      <PageHeader>
        <Heading className="text-center" variant="h2">
          {t('instruments.accessible.title')}
        </Heading>
      </PageHeader>
      <WithFallback
        Component={InstrumentShowcase}
        props={{
          data: instrumentInfoQuery.data?.filter((instrument) => {
            if (!accessibleInstrumentIds.has(instrument.id)) {
              return false;
            }
            if (instrument.internal?.name === ORION_FOLLOWUP_INTERNAL_NAME) {
              return hasOrionSelectionWithUserCode;
            }
            return true;
          }),
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
