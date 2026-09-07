import { DataTransferObject } from '@douglasneuroinformatics/libnest';
import { z } from 'zod/v4';

export class ReserveOrionPatientCodeDto extends DataTransferObject({
  groupId: z.string().min(1)
}) {}
