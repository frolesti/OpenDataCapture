import React, { useMemo } from 'react';

import { estimatePasswordStrength } from '@douglasneuroinformatics/libpasswd';
import { Form, Heading } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { Group } from '@opendatacapture/schemas/group';
import type { User } from '@opendatacapture/schemas/user';
import type { Promisable } from 'type-fest';
import { z } from 'zod/v4';

import { PageHeader } from '@/components/PageHeader';
import { UserIcon } from '@/components/UserIcon';
import { formatHospitalLabel } from '@/components/admin/groups/hospitals';
import type { CurrentUser } from '@/store/types';

export type ProfileProps = {
  currentGroup: Group | null;
  currentUser: CurrentUser;
  onSubmit: (data: { password: string }) => Promisable<void>;
  profileUser: null | (User & { hospital?: null | string });
};

export const Profile = ({ currentGroup, currentUser, onSubmit, profileUser }: ProfileProps) => {
  const { resolvedLanguage, t } = useTranslation();
  const isInvestigator = (profileUser?.basePermissionLevel ?? currentUser.basePermissionLevel) === 'STANDARD';

  const userFullName =
    `${profileUser?.firstName ?? currentUser.firstName ?? ''} ${profileUser?.lastName ?? currentUser.lastName ?? ''}`.trim();

  const groupNames = useMemo(() => {
    if (!currentUser.groups.length) {
      return '-';
    }
    return currentUser.groups.map((group) => group.name).join(', ');
  }, [currentUser.groups]);

  const hospitalNames = useMemo(() => {
    const hospitals = currentUser.groups
      .flatMap((group) => group.hospitals)
      .map((hospital) => hospital.trim())
      .filter(Boolean)
      .map((hospital) => formatHospitalLabel(hospital));
    const uniqueHospitals = Array.from(new Set(hospitals));
    if (!uniqueHospitals.length && currentGroup?.hospitals.length) {
      return currentGroup.hospitals.map((hospital) => formatHospitalLabel(hospital)).join(', ');
    }
    if (!uniqueHospitals.length) {
      return '-';
    }
    return uniqueHospitals.join(', ');
  }, [currentGroup?.hospitals, currentUser.groups]);

  const investigatorHospital = useMemo(() => {
    const rawHospital = profileUser?.hospital ?? currentGroup?.hospitals[0] ?? currentUser.groups[0]?.hospitals[0];
    if (!rawHospital) {
      return '-';
    }
    return formatHospitalLabel(rawHospital);
  }, [currentGroup?.hospitals, currentUser.groups, profileUser?.hospital]);

  const $ChangePasswordFormData = useMemo(() => {
    return z
      .object({
        password: z.string().min(1)
      })
      .check((ctx) => {
        if (!estimatePasswordStrength(ctx.value.password).success) {
          ctx.issues.push({
            code: 'custom',
            fatal: true,
            input: ctx.value.password,
            message: t('common.insufficientPasswordStrength'),
            path: ['password']
          });
          return z.NEVER;
        }
      });
  }, [resolvedLanguage, t]);

  return (
    <div className="container mx-auto max-w-3xl p-4">
      <PageHeader>
        <Heading className="text-center" variant="h2">
          {t({
            en: 'El meu perfil',
            fr: 'Mi perfil'
          })}
        </Heading>
      </PageHeader>

      <div className="grid gap-6">
        {/* Personal Data Card */}
        <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-slate-950">
          <div className="mb-6 flex flex-col items-center gap-4">
            <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
              <UserIcon className="h-16 w-16 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="text-center">
              <Heading variant="h3">{userFullName || currentUser.username}</Heading>
              <p className="text-slate-500 dark:text-slate-400">@{currentUser.username}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 border-t pt-6 text-center md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-500 dark:text-slate-400">
                {t({
                  en: 'Nom',
                  fr: 'Nombre'
                })}
              </label>
              <p className="text-lg font-medium">{profileUser?.firstName ?? currentUser.firstName ?? '-'}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-500 dark:text-slate-400">
                {t({
                  en: 'Cognoms',
                  fr: 'Apellidos'
                })}
              </label>
              <p className="text-lg font-medium">{profileUser?.lastName ?? currentUser.lastName ?? '-'}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('common.username')}
              </label>
              <p className="text-lg font-medium">{currentUser.username}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-500 dark:text-slate-400">
                {t({
                  en: 'Correu',
                  fr: 'Correo'
                })}
              </label>
              <p className="text-lg font-medium">{profileUser?.email ?? '-'}</p>
            </div>
            {isInvestigator ? (
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t({
                    en: 'Hospital',
                    fr: 'Hospital'
                  })}
                </label>
                <p className="text-lg font-medium">{investigatorHospital}</p>
              </div>
            ) : (
              <React.Fragment>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-500 dark:text-slate-400">
                    {t({
                      en: 'Grups',
                      fr: 'Grupos'
                    })}
                  </label>
                  <p className="text-lg font-medium">{groupNames}</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-500 dark:text-slate-400">
                    {t({
                      en: 'Grup actual',
                      fr: 'Grupo actual'
                    })}
                  </label>
                  <p className="text-lg font-medium">{currentGroup?.name || '-'}</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-500 dark:text-slate-400">
                    {t({
                      en: 'Hospital del grup actual',
                      fr: 'Hospital del grupo actual'
                    })}
                  </label>
                  <p className="text-lg font-medium">
                    {currentGroup?.hospitals[0] ? formatHospitalLabel(currentGroup.hospitals[0]) : '-'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-500 dark:text-slate-400">
                    {t({
                      en: 'Hospitals disponibles',
                      fr: 'Hospitales disponibles'
                    })}
                  </label>
                  <p className="text-lg font-medium">{investigatorHospital}</p>
                </div>
              </React.Fragment>
            )}
          </div>
        </div>

        {/* Security Card */}
        <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-slate-950">
          <div className="mb-4">
            <Heading variant="h4">
              {t({
                en: 'Seguretat',
                fr: 'Seguridad'
              })}
            </Heading>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t({
                en: 'Actualitzeu la vostra contrasenya per mantenir el compte segur.',
                fr: 'Actualice su contraseña para mantener su cuenta segura.'
              })}
            </p>
          </div>

          <Form
            content={[
              {
                fields: {
                  password: {
                    calculateStrength: (password) => {
                      return estimatePasswordStrength(password).score;
                    },
                    description: t({
                      en: 'La contrasenya ha de tenir almenys 8 caràcters, incloent majúscules, minúscules, números i símbols.',
                      fr: 'La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas, números y símbolos.'
                    }),
                    kind: 'string',
                    label: t({
                      en: 'Nova contrasenya',
                      fr: 'Nueva contraseña'
                    }),
                    variant: 'password'
                  }
                },
                title: ''
              }
            ]}
            submitBtnLabel={t({
              en: 'Actualitzar contrasenya',
              fr: 'Actualizar contraseña'
            })}
            validationSchema={$ChangePasswordFormData}
            onSubmit={onSubmit}
          />
        </div>
      </div>
    </div>
  );
};
