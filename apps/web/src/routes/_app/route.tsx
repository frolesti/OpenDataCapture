import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect } from 'react';

import { Layout } from '@/components/Layout';
import { setupStateQueryOptions } from '@/hooks/useSetupStateQuery';
import { DisclaimerProvider } from '@/providers/DisclaimerProvider';
import { ForceClearQueryCacheProvider } from '@/providers/ForceClearQueryCacheProvider';
import { InactivityProvider } from '@/providers/InactivityProvider';
import { WalkthroughProvider } from '@/providers/WalkthroughProvider';
import { useAppStore } from '@/store';

type CurrentProfileResponse = {
  basePermissionLevel: 'ADMIN' | 'GROUP_MANAGER' | 'STANDARD';
  firstName: string;
  groups: Array<{
    id: string;
    accessibleInstrumentIds: string[];
    hospitals: string[];
    name: string;
    settings?: {
      defaultIdentificationMethod?: string;
      defaultInstrumentId?: string;
      defaultSubjectIdentifierDisplayType?: string;
      idValidationRegex?: string;
      subjectIdScopePrefix?: string;
    };
    type: string;
  }>;
  id: string;
  lastName: string;
  username: string;
};

const AppShell = () => {
  const currentUser = useAppStore((store) => store.currentUser);
  const syncCurrentUserFromProfile = useAppStore((store) => store.syncCurrentUserFromProfile);

  const currentProfileQuery = useQuery({
    enabled: Boolean(currentUser?.id),
    queryFn: async () => {
      const response = await axios.get<CurrentProfileResponse>('/v1/users/me');
      return response.data;
    },
    queryKey: ['current-user-profile-sync', currentUser?.id],
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: false
  });

  useEffect(() => {
    if (currentProfileQuery.data) {
      syncCurrentUserFromProfile(currentProfileQuery.data);
    }
  }, [currentProfileQuery.data, syncCurrentUserFromProfile]);

  return (
    <InactivityProvider>
      <DisclaimerProvider>
        <WalkthroughProvider>
          <ForceClearQueryCacheProvider>
            <Layout />
          </ForceClearQueryCacheProvider>
        </WalkthroughProvider>
      </DisclaimerProvider>
    </InactivityProvider>
  );
};

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    const setupState = await context.queryClient.fetchQuery(setupStateQueryOptions());
    if (!setupState.isSetup) {
      throw redirect({ to: '/setup' });
    }
    const { accessToken } = useAppStore.getState();
    if (!accessToken) {
      throw redirect({ to: '/auth/login' });
    }
  },
  component: () => {
    return <AppShell />;
  }
});
