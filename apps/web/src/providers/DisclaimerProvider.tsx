import React from 'react';

import { Button, Dialog } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';

import { useAppStore } from '@/store';

export const DisclaimerProvider: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const logout = useAppStore((store) => store.logout);
  const isDisclaimerAccepted = useAppStore((store) => store.isDisclaimerAccepted);
  const setIsDisclaimerAccepted = useAppStore((store) => store.setIsDisclaimerAccepted);
  const { t } = useTranslation();

  return (
    <React.Fragment>
      {children}
      <Dialog open={!isDisclaimerAccepted}>
        <Dialog.Content onOpenAutoFocus={(event) => event.preventDefault()}>
          <Dialog.Header>
            <Dialog.Title>{t('common.disclaimer.title')}</Dialog.Title>
            <Dialog.Description>{t('common.disclaimer.message')}</Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button type="button" onClick={() => setIsDisclaimerAccepted(true)}>
              {t('common.disclaimer.accept')}
            </Button>
            <Button type="button" variant="outline" onClick={logout}>
              {t('common.disclaimer.decline')}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </React.Fragment>
  );
};
