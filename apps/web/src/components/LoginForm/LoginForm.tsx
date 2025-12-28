/* eslint-disable perfectionist/sort-objects */

import { useState } from 'react';

import { Form } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { LoginCredentials } from '@opendatacapture/schemas/auth';
import axios from 'axios';
import { z } from 'zod/v4';

type LoginFormProps = {
  onResetModeChange?: (isResetMode: boolean) => void;
  onSubmit: (credentials: LoginCredentials) => void;
};

export const LoginForm = ({ onResetModeChange, onSubmit }: LoginFormProps) => {
  const { t } = useTranslation('auth');
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStatus, setResetStatus] = useState<'error' | 'idle' | 'sending' | 'sent'>('idle');

  const handleResetModeChange = (mode: boolean) => {
    setIsResetMode(mode);
    onResetModeChange?.(mode);
  };

  if (isResetMode) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-center text-lg font-medium text-slate-900 dark:text-slate-100">
          {t('resetPassword.title')}
        </h3>
        {resetStatus === 'sent' ? (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('resetPassword.success')}</p>
            <button
              className="text-sm font-medium text-[#9A99FF] hover:underline"
              type="button"
              onClick={() => {
                handleResetModeChange(false);
                setResetStatus('idle');
              }}
            >
              {t('resetPassword.backToLogin')}
            </button>
          </div>
        ) : (
          <>
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">{t('resetPassword.instruction')}</p>
            <Form
              content={{
                identifier: {
                  kind: 'string',
                  label: t('resetPassword.usernameOrEmail'),
                  variant: 'input'
                }
              }}
              submitBtnLabel={t('resetPassword.submit')}
              validationSchema={z.object({
                identifier: z.string().min(1)
              })}
              onSubmit={async ({ identifier }) => {
                setResetStatus('sending');
                try {
                  await axios.post('/v1/support/forgot-password', { identifier });
                  setResetStatus('sent');
                } catch (err) {
                  console.error(err);
                  setResetStatus('error');
                }
              }}
            />
            {resetStatus === 'error' && (
              <p className="text-center text-sm text-red-600 dark:text-red-400">{t('resetPassword.error')}</p>
            )}
            <button
              className="mt-2 text-center text-sm text-slate-500 hover:underline dark:text-slate-400"
              type="button"
              onClick={() => handleResetModeChange(false)}
            >
              {t('resetPassword.cancel')}
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Form
        content={{
          username: {
            kind: 'string',
            label: t('username'),
            variant: 'input'
          },
          password: {
            kind: 'string',
            label: t('password'),
            variant: 'password'
          }
        }}
        data-testid="login-form"
        submitBtnLabel={t('login')}
        validationSchema={z.object({
          username: z.string().min(1),
          password: z.string().min(1)
        })}
        onSubmit={onSubmit}
      />
      <button
        className="text-center text-sm text-slate-500 hover:underline dark:text-slate-400"
        type="button"
        onClick={() => handleResetModeChange(true)}
      >
        {t('forgotPassword')}
      </button>
    </div>
  );
};
