import { ValidationSchema } from '@douglasneuroinformatics/libnest';
import { ApiProperty } from '@nestjs/swagger';
import { $CreateGroupData } from '@opendatacapture/schemas/group';
import type { CreateGroupData, GroupSettings, GroupType } from '@opendatacapture/schemas/group';

@ValidationSchema($CreateGroupData)
export class CreateGroupDto implements CreateGroupData {
  @ApiProperty({
    description: 'Selected instrument IDs. Omit to retain the legacy default of all instruments.',
    required: false,
    type: [String]
  })
  accessibleInstrumentIds?: string[];

  @ApiProperty({ required: false, type: [String] })
  hospitals: string[];

  @ApiProperty({ example: 'Depression Clinic' })
  name: string;

  @ApiProperty({ enum: ['OR', 'TH'], nullable: true, required: false })
  studyCode?: 'OR' | 'TH' | null;

  @ApiProperty({ required: false })
  settings?: GroupSettings;

  @ApiProperty({ enum: ['CLINICAL', 'RESEARCH'] })
  type: GroupType;
}
