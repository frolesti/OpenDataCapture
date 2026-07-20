import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/admin/users/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/users/create' });
  }
});
