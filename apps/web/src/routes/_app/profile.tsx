import { createFileRoute } from '@tanstack/react-router';

import { Profile } from '@/components/Profile';
import { useUpdateUserMutation } from '@/hooks/useUpdateUserMutation';
import { useAppStore } from '@/store';

const RouteComponent = () => {
  const currentGroup = useAppStore((store) => store.currentGroup);
  const currentUser = useAppStore((store) => store.currentUser);
  const updateUserMutation = useUpdateUserMutation();

  if (!currentUser) {
    return null;
  }

  return (
    <Profile
      currentGroup={currentGroup}
      currentUser={currentUser}
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
