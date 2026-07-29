import { ValidationSchema } from '@douglasneuroinformatics/libnest';
import { PartialType } from '@nestjs/swagger';
import { $UpdatePendingInvestigatorData } from '@opendatacapture/schemas/user';

import { CreatePendingInvestigatorDto } from './create-pending-investigator.dto';

@ValidationSchema($UpdatePendingInvestigatorData)
export class UpdatePendingInvestigatorDto extends PartialType(CreatePendingInvestigatorDto) {}
