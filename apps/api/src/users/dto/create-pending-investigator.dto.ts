import { ValidationSchema } from '@douglasneuroinformatics/libnest';
import { ApiProperty } from '@nestjs/swagger';
import type { BasePermissionLevel, CreatePendingInvestigatorData } from '@opendatacapture/schemas/user';
import { $CreatePendingInvestigatorData } from '@opendatacapture/schemas/user';
import type { Sex } from '@opendatacapture/schemas/subject';

@ValidationSchema($CreatePendingInvestigatorData)
export class CreatePendingInvestigatorDto implements CreatePendingInvestigatorData {
  @ApiProperty({
    enum: ['ADMIN', 'GROUP_MANAGER', 'STANDARD'] satisfies BasePermissionLevel[]
  })
  basePermissionLevel: BasePermissionLevel;

  @ApiProperty({ required: false })
  dateOfBirth?: Date;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty({ type: [String] })
  groupIds: string[];

  @ApiProperty()
  hospital: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ enum: ['MALE', 'FEMALE'], required: false })
  sex?: Sex;

  @ApiProperty()
  signed: boolean;
}
