import { ValidationSchema } from '@douglasneuroinformatics/libnest';
import { $UpdateGroupData } from '@opendatacapture/schemas/group';
import type { GroupSettings, GroupType, StudyCode, UpdateGroupData } from '@opendatacapture/schemas/group';

@ValidationSchema($UpdateGroupData)
export class UpdateGroupDto implements UpdateGroupData {
  accessibleInstrumentIds?: string[];
  hospitals?: string[];
  name?: string;
  settings?: Partial<GroupSettings>;
  studyCode?: StudyCode | null;
  type?: GroupType;
}
