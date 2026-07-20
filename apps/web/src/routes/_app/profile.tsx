import { createFileRoute } from '@tanstack/react-router';
import { $User } from '@opendatacapture/schemas/user';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { z } from 'zod/v4';

import { Profile } from '@/components/Profile';
import { useUpdateUserMutation } from '@/hooks/useUpdateUserMutation';
import { useAppStore } from '@/store';

const $ProfileUser = $User.extend({
  hospital: z.string().nullish()
});

const RouteComponent = () => {
  const currentGroup = useAppStore((store) => store.currentGroup);
  const currentUser = useAppStore((store) => store.currentUser);
  const updateUserMutation = useUpdateUserMutation();

  const profileUserQuery = useQuery({
    enabled: Boolean(currentUser?.id),
    queryFn: async () => {
      const response = await axios.get('/v1/users/me');
      return $ProfileUser.parse(response.data);
    },
    queryKey: ['profile-user', currentUser?.id],
    retry: false
  });

  if (!currentUser) {
    return null;
  }

  return (
    <Profile
      currentGroup={currentGroup}
      currentUser={currentUser}
      profileUser={profileUserQuery.data ?? null}
      onSubmit={async (data) => {
        await updateUserMutation.mutateAsync({
          data: { password: data.password },
          id: currentUser.id
        });
      }}
    />
  );
};

// Route definition for the profile page
export const Route = createFileRoute('/_app/profile')({
  component: RouteComponent
});
