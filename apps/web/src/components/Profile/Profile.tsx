import React, { useMemo } from 'react';

import { estimatePasswordStrength } from '@douglasneuroinformatics/libpasswd';
import { Form, Heading } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { Group } from '@opendatacapture/schemas/group';
import type { Promisable } from 'type-fest';
import { z } from 'zod/v4';

import { PageHeader } from '@/components/PageHeader';
import { UserIcon } from '@/components/UserIcon';
import type { CurrentUser } from '@/store/types';

export type ProfileProps = {
  currentGroup: Group | null;
  currentUser: CurrentUser;
  onSubmit: (data: { password: string }) => Promisable<void>;
};

export const Profile = ({ currentGroup, currentUser, onSubmit }: ProfileProps) => {
  const { resolvedLanguage, t } = useTranslation();

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
            ca: 'El meu perfil',
            en: 'My Profile',
            es: 'Mi perfil',
            fr: 'Mon profil'
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
              <Heading variant="h3">{`${currentUser.firstName} ${currentUser.lastName}`}</Heading>
              <p className="text-slate-500 dark:text-slate-400">@{currentUser.username}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 border-t pt-6 text-center md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-500 dark:text-slate-400">
                {t({
                  ca: 'Nom',
                  en: 'First Name',
                  es: 'Nombre',
                  fr: 'Prénom'
                })}
              </label>
              <p className="text-lg font-medium">{currentUser.firstName || '-'}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-500 dark:text-slate-400">
                {t({
                  ca: 'Cognoms',
                  en: 'Last Name',
                  es: 'Apellidos',
                  fr: 'Nom de famille'
                })}
              </label>
              <p className="text-lg font-medium">{currentUser.lastName || '-'}</p>
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
                  ca: 'Hospital',
                  en: 'Hospital',
                  es: 'Hospital',
                  fr: 'Hôpital'
                })}
              </label>
              <p className="text-lg font-medium">{currentGroup?.name || '-'}</p>
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-slate-950">
          <div className="mb-4">
            <Heading variant="h4">
              {t({
                ca: 'Seguretat',
                en: 'Security',
                es: 'Seguridad',
                fr: 'Sécurité'
              })}
            </Heading>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t({
                ca: 'Actualitzeu la vostra contrasenya per mantenir el vostre compte segur.',
                en: 'Update your password to keep your account secure.',
                es: 'Actualice su contraseña para mantener su cuenta segura.',
                fr: 'Mettez à jour votre mot de passe pour assurer la sécurité de votre compte.'
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
                      ca: 'La contrasenya ha de tenir almenys 8 caràcters, incloent majúscules, minúscules, números i símbols.',
                      en: 'Password must be at least 8 characters long, including uppercase, lowercase, numbers, and symbols.',
                      es: 'La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas, números y símbolos.',
                      fr: 'Le mot de passe doit contenir au moins 8 caractères, y compris des majuscules, des minuscules, des chiffres et des symboles.'
                    }),
                    kind: 'string',
                    label: t({
                      ca: 'Nova contrasenya',
                      en: 'New Password',
                      es: 'Nueva contraseña',
                      fr: 'Nouveau mot de passe'
                    }),
                    variant: 'password'
                  }
                },
                title: ''
              }
            ]}
            submitBtnLabel={t({
              ca: 'Actualitzar contrasenya',
              en: 'Update Password',
              es: 'Actualizar contraseña',
              fr: 'Mettre à jour le mot de passe'
            })}
            validationSchema={$ChangePasswordFormData}
            onSubmit={onSubmit}
          />
        </div>
      </div>
    </div>
  );
};
