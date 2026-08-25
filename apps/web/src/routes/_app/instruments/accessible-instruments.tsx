import React from 'react';

import { Heading } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { InstrumentShowcase } from '@/components/InstrumentShowcase';
import { PageHeader } from '@/components/PageHeader';
import { WithFallback } from '@/components/WithFallback';
import { useInstrumentInfoQuery } from '@/hooks/useInstrumentInfoQuery';
import { useInstrumentRecords } from '@/hooks/useInstrumentRecords';
import { useAppStore } from '@/store';

const ORION_SELECTION_INTERNAL_NAME = 'ORION_PR_2026_SELECTION';
const ORION_FOLLOWUP_INTERNAL_NAME = 'ORION_PR_2026_FOLLOWUP';

const RouteComponent = () => {
  const currentSession = useAppStore((store) => store.currentSession);
  const currentUser = useAppStore((store) => store.currentUser);
  const currentGroup = useAppStore((store) => store.currentGroup);
  const changeGroup = useAppStore((store) => store.changeGroup);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const instrumentInfoQuery = useInstrumentInfoQuery();
  const accessibleInstrumentIds = new Set(currentUser?.groups.flatMap((group) => group.accessibleInstrumentIds) ?? []);
  const orionSelectionInstrument = (instrumentInfoQuery.data ?? []).find(
    (instrument) => instrument.internal?.name === ORION_SELECTION_INTERNAL_NAME
  );
  const orionSelectionRecordsQuery = useInstrumentRecords({
    enabled: Boolean(currentSession?.subject.id && orionSelectionInstrument?.id),
    params: {
      instrumentId: orionSelectionInstrument?.id,
      subjectId: currentSession?.subject.id
    }
  });
  const hasEligibleOrionSelection = (orionSelectionRecordsQuery.data ?? []).some((record) => {
    const data = record.data as Record<string, unknown>;
    const inclusionKeys = ['inclusion_1', 'inclusion_2', 'inclusion_3', 'inclusion_4', 'inclusion_5', 'inclusion_6'];
    const exclusionKeys = ['exclusion_1', 'exclusion_2', 'exclusion_3', 'exclusion_4', 'exclusion_5', 'exclusion_6'];
    return (
      data.informed_consent === 'si' &&
      inclusionKeys.every((key) => data[key] === 'si') &&
      exclusionKeys.every((key) => data[key] === 'no')
    );
  });

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
          data: currentUser
            ? instrumentInfoQuery.data?.filter((instrument) => {
                if (!accessibleInstrumentIds.has(instrument.id)) {
                  return false;
                }
                if (instrument.internal?.name === ORION_FOLLOWUP_INTERNAL_NAME) {
                  return hasEligibleOrionSelection;
                }
                return true;
              })
            : instrumentInfoQuery.data,
          onSelect: (instrument) => {
            void navigate({
              params: { id: instrument.id },
              search: {
                recordId: undefined
              },
              state: { instrumentTitle: instrument.details.title },
              to: `/instruments/render/$id`
            });
          },
          groups: currentUser?.groups,
          onGroupChange: (groupId) => {
            const group = currentUser?.groups.find((entry) => entry.id === groupId);
            if (group) {
              changeGroup(group);
            }
          },
          selectedGroupId: currentGroup?.id
        }}
      />
    </div>
  );
};

export const Route = createFileRoute('/_app/instruments/accessible-instruments')({
  component: RouteComponent
});
