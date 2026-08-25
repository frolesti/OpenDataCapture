import { useEffect, useState } from 'react';

import { AlertDialog, Button, LanguageToggle, Sheet, ThemeToggle } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import { Branding } from '@opendatacapture/react-core';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { Info, LogOutIcon, MenuIcon, SchoolIcon, StopCircle } from 'lucide-react';

import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useNavItems } from '@/hooks/useNavItems';
import { useAppStore } from '@/store';

import { NavButton } from '../NavButton';
import { UserIcon } from '../UserIcon';

export const Navbar = () => {
  const currentSession = useAppStore((store) => store.currentSession);
  const endSession = useAppStore((store) => store.endSession);
  const currentUser = useAppStore((store) => store.currentUser);
  const logout = useAppStore((store) => store.logout);
  const setIsWalkthroughOpen = useAppStore((store) => store.setIsWalkthroughOpen);
  const [isOpen, setIsOpen] = useState(false);
  const navItems = useNavItems();
  const { t } = useTranslation('layout');
  const location = useLocation();
  const navigate = useNavigate();

  const closeCurrentSession = ({ preserveDraft }: { preserveDraft: boolean }) => {
    if (location.pathname.startsWith('/instruments/render/')) {
      window.dispatchEvent(
        new CustomEvent(preserveDraft ? 'odc-save-draft-before-close' : 'odc-discard-draft-before-close')
      );
    }
    endSession();
    setIsOpen(false);
    void navigate({ to: '/instruments/accessible-instruments' });
  };

  // This is to prevent ugly styling when resizing the viewport
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (isDesktop) {
      setIsOpen(false);
    }
  }, [isDesktop]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <div
        className="fixed top-0 z-10 w-full bg-white/80 text-slate-700 shadow-sm backdrop-blur-lg dark:bg-slate-800/75 dark:text-slate-300"
        data-testid="navbar"
      >
        <div className="h-full w-full bg-inherit">
          <div className="container flex items-center justify-between bg-inherit py-2 font-medium">
            <Branding className="[&>span]:hidden" />
            <Sheet.Trigger
              data-testid="navbar-menu-trigger"
              onClick={() => {
                setIsOpen(true);
              }}
            >
              <MenuIcon style={{ height: 28, width: 28 }} />
            </Sheet.Trigger>
          </div>
        </div>
      </div>
      <Sheet.Trigger asChild>
        <Button variant="outline">Open</Button>
      </Sheet.Trigger>
      <Sheet.Content className="flex h-full flex-col">
        <Sheet.Header>
          <Sheet.Title className="sr-only">Navigation menu</Sheet.Title>
          <Sheet.Description className="sr-only">Main navigation and account actions</Sheet.Description>
          <Branding className="h-10" fontSize="md" />
        </Sheet.Header>
        {/* Removed undefined Separator */}
        <nav className="flex w-full grow flex-col divide-y divide-slate-200 dark:divide-slate-700">
          {navItems.map((items, i) => (
            <div className="flex flex-col py-1 first:pt-0 last:pb-0" key={i}>
              {items.map(({ disabled, url, ...props }) => (
                <NavButton
                  activeClassName="bg-slate-200 text-slate-900 dark:text-slate-100 dark:bg-slate-800"
                  className="text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 hover:dark:text-slate-100"
                  disabled={disabled && location.pathname !== url}
                  isActive={location.pathname === url}
                  key={url}
                  url={url}
                  onClick={() => {
                    setIsOpen(false);
                    void navigate({ to: url });
                  }}
                  {...props}
                />
              ))}
              {i === navItems.length - 1 && (
                <AlertDialog>
                  <AlertDialog.Trigger asChild>
                    <div>
                      <NavButton
                        activeClassName="bg-slate-200 text-slate-900"
                        className="text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 hover:dark:text-slate-100"
                        disabled={currentSession === null}
                        icon={StopCircle}
                        isActive={false}
                        label={t('navLinks.endSession')}
                        url="#"
                      />
                    </div>
                  </AlertDialog.Trigger>
                  <AlertDialog.Content>
                    <AlertDialog.Header>
                      <AlertDialog.Title>
                        {t({
                          en: 'Tancar registre actual',
                          fr: 'Cerrar registro actual'
                        } as any)}
                      </AlertDialog.Title>
                      <AlertDialog.Description>
                        {t({
                          en: 'Podeu guardar el progrés per continuar més tard o tancar sense desar.',
                          fr: 'Puede guardar el progreso para continuar más tarde o cerrar sin guardar.'
                        } as any)}
                      </AlertDialog.Description>
                    </AlertDialog.Header>
                    <AlertDialog.Footer className="flex flex-wrap gap-2">
                      <AlertDialog.Action
                        className="min-w-24"
                        onClick={() => closeCurrentSession({ preserveDraft: true })}
                      >
                        {t({
                          en: 'Guardar i tancar',
                          fr: 'Guardar y cerrar'
                        } as any)}
                      </AlertDialog.Action>
                      <AlertDialog.Action
                        className="min-w-24"
                        onClick={() => closeCurrentSession({ preserveDraft: false })}
                      >
                        {t({
                          en: 'Tancar sense guardar',
                          fr: 'Cerrar sin guardar'
                        } as any)}
                      </AlertDialog.Action>
                      <AlertDialog.Cancel className="min-w-24">
                        {t({
                          en: 'Cancel·lar',
                          fr: 'Cancelar'
                        } as any)}
                      </AlertDialog.Cancel>
                    </AlertDialog.Footer>
                  </AlertDialog.Content>
                </AlertDialog>
              )}
            </div>
          ))}
        </nav>
        <Sheet.Footer className="mt-auto">
          <hr className="h-[1px] border-none bg-slate-200 dark:bg-slate-700" />
          {currentUser && (
            <div className="flex flex-col gap-1 py-2">
              <div className="flex items-center gap-2 px-1">
                <UserIcon />
                <span className="text-sm font-medium">{currentUser.username}</span>
              </div>
              <div className="flex flex-col">
                <button
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={() => {
                    setIsOpen(false);
                    void navigate({ to: '/about' });
                  }}
                >
                  <Info className="h-4 w-4" />
                  {t('userDropup.info')}
                </button>
                <button
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                  disabled={currentSession !== null}
                  onClick={() => {
                    setIsOpen(false);
                    setIsWalkthroughOpen(true);
                  }}
                >
                  <SchoolIcon className="h-4 w-4" />
                  {t('userDropup.tutorial')}
                </button>
                <button
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  onClick={logout}
                >
                  <LogOutIcon className="h-4 w-4" />
                  {t('userDropup.logout')}
                </button>
              </div>
              <hr className="h-[1px] border-none bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center justify-end gap-2 pt-1">
                <LanguageToggle
                  options={{
                    en: 'Català',
                    fr: 'Español'
                  }}
                  variant="outline"
                />
                <ThemeToggle variant="outline" />
              </div>
            </div>
          )}
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet>
  );
};
