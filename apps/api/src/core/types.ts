import type { AppAbility } from '@douglasneuroinformatics/libnest';
import type { User } from '@prisma/client';

export type EntityOperationOptions = {
  ability?: AppAbility;
  user?: User;
};
