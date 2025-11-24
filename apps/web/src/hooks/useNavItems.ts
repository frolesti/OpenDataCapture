import React, { useEffect, useState } from 'react';

import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import {
  BarChartBigIcon,
  CirclePlayIcon,
  CogIcon,
  ComputerIcon,
  DatabaseIcon,
  EyeIcon,
  UploadIcon,
  UserCogIcon,
  UserIcon,
  UsersIcon
} from 'lucide-react';

import { useAppStore } from '@/store';

import { useSetupStateQuery } from './useSetupStateQuery';

export type NavItem = {
  disabled?: boolean;
  icon: React.ComponentType<Omit<React.SVGProps<SVGSVGElement>, 'ref'>>;
  label: string;
  url: string;
};

/**
 * Generates the nav items for the current user, group, and session. This is displayed by the sidebar
 * or navbar, depending on the size of the user's device.
 *
 * @returns - a tuple consisting of an array of global and session nav items respectively
 */
export function useNavItems() {
  const currentGroup = useAppStore((store) => store.currentGroup);
  const currentSession = useAppStore((store) => store.currentSession);
  const currentUser = useAppStore((store) => store.currentUser);
  const [navItems, setNavItems] = useState<NavItem[][]>([[], []]);
  const { resolvedLanguage, t } = useTranslation();
  const setupStateQuery = useSetupStateQuery();

  useEffect(() => {
    const ability = currentUser?.ability;
    const globalItems: NavItem[] = [];
    if (
      ability?.can('read', 'Instrument') &&
      ability.can('read', 'InstrumentRecord') &&
      ability.can('read', 'Subject') &&
      ability.can('read', 'User')
    ) {
      globalItems.push({
        icon: BarChartBigIcon,
        label: t('layout.navLinks.dashboard'),
        url: '/dashboard'
      });
    }
    if (ability?.can('read', 'Subject') && ability.can('read', 'InstrumentRecord')) {
      globalItems.push({
        icon: DatabaseIcon,
        label: t('layout.navLinks.datahub'),
        url: '/datahub'
      });
    }
    if (
      currentGroup &&
      ability?.can('manage', 'Group') &&
      ability?.can('read', 'Subject') &&
      ability.can('create', 'InstrumentRecord') &&
      setupStateQuery.data.isExperimentalFeaturesEnabled
    ) {
      globalItems.push({
        icon: UploadIcon,
        label: t(`layout.navLinks.upload`),
        url: '/upload'
      });
    }
    if (currentGroup && ability?.can('manage', 'Group')) {
      globalItems.push({
        icon: UsersIcon,
        label: t('layout.navLinks.manageGroup'),
        url: '/group/manage'
      });
    }

    globalItems.push({
      icon: UserIcon,
      label: t({
        ca: 'El meu perfil',
        en: 'My Profile',
        es: 'Mi perfil',
        fr: 'Mon profil'
      }),
      url: '/profile'
    });

    const adminItems: NavItem[] = [];
    if (ability?.can('manage', 'all')) {
      // adminItems.push({
      //   icon: CogIcon,
      //   label: t('layout.navLinks.appSettings'),
      //   url: '/admin/settings'
      // });
      adminItems.push({
        icon: UsersIcon,
        label: t('layout.navLinks.manageGroups'),
        url: '/admin/groups'
      });
      adminItems.push({
        icon: UserCogIcon,
        label: t('layout.navLinks.manageUsers'),
        url: '/admin/users'
      });
    }

    const sessionItems: NavItem[] = [];
    if (ability?.can('create', 'Session')) {
      sessionItems.push({
        disabled: currentSession !== null,
        icon: CirclePlayIcon,
        label: t('layout.navLinks.startSession'),
        url: '/session/start-session'
      });
    }
    if (ability?.can('create', 'InstrumentRecord')) {
      sessionItems.push({
        disabled: currentSession === null,
        icon: ComputerIcon,
        label: t('layout.navLinks.accessibleInstruments'),
        url: '/instruments/accessible-instruments'
      });
    }
    if (ability?.can('read', 'Subject') && ability.can('read', 'InstrumentRecord')) {
      sessionItems.push({
        disabled: currentSession === null,
        icon: EyeIcon,
        label: t('layout.navLinks.viewCurrentSubject'),
        url: `/datahub/${currentSession?.subjectId}/table`
      });
    }
    setNavItems([globalItems, adminItems, sessionItems].filter((arr) => arr.length));
  }, [currentSession, currentUser, resolvedLanguage, setupStateQuery.data.isExperimentalFeaturesEnabled]);

  return navItems;
}
