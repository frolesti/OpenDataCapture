import { useNotificationsStore, useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { InitAppOptions } from '@opendatacapture/schemas/setup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { SETUP_STATE_QUERY_KEY } from './useSetupStateQuery';

export function useCreateSetupStateMutation() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationsStore((store) => store.addNotification);
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: InitAppOptions) => axios.post('/v1/setup', data),
    onSuccess: async () => {
      addNotification({ message: t('core.success'), title: t('core.success'), type: 'success' });
      await queryClient.invalidateQueries({ queryKey: [SETUP_STATE_QUERY_KEY] });
    }
  });
}
