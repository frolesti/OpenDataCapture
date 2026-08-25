import React, { useState } from 'react';

import { Heading } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { encodeScopedSubjectId } from '@opendatacapture/subject-utils';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { InstrumentShowcase } from '@/components/InstrumentShowcase';
import { PageHeader } from '@/components/PageHeader';
import { useCreateSessionMutation } from '@/hooks/useCreateSessionMutation';
import { useInstrumentInfoQuery } from '@/hooks/useInstrumentInfoQuery';
import { useAppStore } from '@/store';

const RouteComponent = () => {
  const currentGroup = useAppStore((store) => store.currentGroup);
  const currentSession = useAppStore((store) => store.currentSession);
  const startSession = useAppStore((store) => store.startSession);
  const currentUser = useAppStore((store) => store.currentUser);
  const changeGroup = useAppStore((store) => store.changeGroup);
  const navigate = useNavigate();
  const [selectedGroupId, setSelectedGroupId] = useState(currentGroup?.id ?? currentUser?.groups[0]?.id);
  const sessionGroup = currentUser?.groups.find((group) => group.id === selectedGroupId) ?? currentGroup;

  const { t } = useTranslation();
  const createSessionMutation = useCreateSessionMutation();
  const instrumentInfoQuery = useInstrumentInfoQuery();

  const handleInstrumentSelect = async (instrument: { details: { title: string }; id: string }) => {
    if (currentSession || !currentUser || !sessionGroup) {
      return;
    }

    const session = await createSessionMutation.mutateAsync({
      date: new Date(),
      groupId: sessionGroup.id,
      subjectData: {
        id: encodeScopedSubjectId(currentUser.username, {
          groupName: sessionGroup.name
        })
      },
      type: 'RETROSPECTIVE',
      username: currentUser.username
    });
    startSession({ ...session, type: 'RETROSPECTIVE' });
    await navigate({
      params: { id: instrument.id },
      state: { instrumentTitle: instrument.details.title },
      to: '/instruments/render/$id'
    });
  };

  return (
    <React.Fragment>
      <PageHeader>
        <Heading className="text-center" variant="h2">
          {t('instruments.accessible.title')}
        </Heading>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl">
        <InstrumentShowcase
          data={instrumentInfoQuery.data ?? []}
          groups={currentUser?.groups}
          onGroupChange={(groupId) => {
            setSelectedGroupId(groupId);
            const group = currentUser?.groups.find((entry) => entry.id === groupId);
            if (group) {
              changeGroup(group);
            }
          }}
          onSelect={(instrument) => void handleInstrumentSelect(instrument)}
          selectedGroupId={sessionGroup?.id}
        />
      </div>
    </React.Fragment>
  );
};

export const Route = createFileRoute('/_app/session/start-session')({
  component: RouteComponent
});
