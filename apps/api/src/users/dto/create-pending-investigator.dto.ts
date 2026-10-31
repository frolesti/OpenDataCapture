import { ValidationSchema } from '@douglasneuroinformatics/libnest';
import { ApiProperty } from '@nestjs/swagger';
import type {
  BasePermissionLevel,
  CreatePendingInvestigatorData,
  ProfessionalTitle,
  StudyHospital
} from '@opendatacapture/schemas/user';
import { $CreatePendingInvestigatorData } from '@opendatacapture/schemas/user';

@ValidationSchema($CreatePendingInvestigatorData)
export class CreatePendingInvestigatorDto implements CreatePendingInvestigatorData {
  @ApiProperty({
    enum: ['ADMIN', 'GROUP_MANAGER', 'STANDARD'] satisfies BasePermissionLevel[]
  })
  basePermissionLevel: BasePermissionLevel;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty({ type: [String] })
  groupIds: string[];

  @ApiProperty()
  hospital: string;

  @ApiProperty({ required: false })
  studyHospitals?: StudyHospital[];

  @ApiProperty()
  lastName: string;

  @ApiProperty({ nullable: true, required: false })
  notes?: string | null;

  @ApiProperty({ enum: ['Dr', 'Dra'], nullable: true, required: false })
  professionalTitle?: ProfessionalTitle | null;

  @ApiProperty()
  signed: boolean;
}
