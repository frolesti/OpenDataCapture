import { createFileRoute, redirect } from '@tanstack/react-router';

const RouteComponent = () => null;

export const Route = createFileRoute('/_app/session/start-session')({
  beforeLoad: () => {
    throw redirect({ to: '/instruments/accessible-instruments' });
  },
  component: RouteComponent
});
