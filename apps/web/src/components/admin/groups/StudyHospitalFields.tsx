import { Button, Checkbox, Label } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { Group, HospitalOption } from '@opendatacapture/schemas/group';
import type { StudyHospital } from '@opendatacapture/schemas/user';

import { HospitalSelect } from './HospitalSelect';

export type HospitalGroup = Pick<Group, 'id' | 'name' | 'hospitals' | 'hospitalIds' | 'hospitalCatalog'>;

export function getHospitalCatalog(group: HospitalGroup): HospitalOption[] {
  if (group.hospitalCatalog) return group.hospitalCatalog;
  if (group.hospitalIds?.length === group.hospitals.length) {
    return group.hospitalIds.map((id, index) => ({
      id,
      name: group.hospitals[index]!,
      isInternal: group.hospitals[index] === 'Alta Medical Services'
    }));
  }
  return [];
}

export function hasCompleteStudyHospitals(
  groups: HospitalGroup[],
  groupIds: string[],
  assignments: StudyHospital[],
  legacyHospital: string,
  isTest: boolean
) {
  return groupIds.every((id) => {
    const group = groups.find((entry) => entry.id === id);
    if (!group) return false;
    const catalog = getHospitalCatalog(group);
    if (!catalog.length) return group.hospitals.includes(legacyHospital);
    const assignment = assignments.find((entry) => entry.groupId === id);
    return catalog.some((entry) => entry.id === assignment?.hospitalId && (isTest || !entry.isInternal));
  });
}

export function StudyHospitalFields({
  groups,
  groupIds,
  assignments,
  legacyHospital,
  isTest,
  onChange,
  onCreate,
  onTestChange,
  numbers,
  disabled
}: {
  groups: HospitalGroup[];
  groupIds: string[];
  assignments: StudyHospital[];
  legacyHospital: string;
  isTest: boolean;
  onChange: (assignments: StudyHospital[], legacyHospital: string) => void;
  onCreate: (groupId: string) => void;
  onTestChange?: (isTest: boolean) => void;
  numbers?: { groupId: string; number: number; isTest: boolean }[];
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0 space-y-3">
      <p className="text-sm font-medium">
        {t({ en: 'Centre sanitari per estudi', fr: 'Centro sanitario por estudio' })}
      </p>
      {onTestChange ? (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={isTest}
            disabled={disabled || Boolean(numbers?.length)}
            onCheckedChange={(checked) => onTestChange(checked === true)}
          />
          {t({ en: 'Compte de proves (numeració separada)', fr: 'Cuenta de pruebas (numeración separada)' })}
        </label>
      ) : null}
      {groupIds.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          {t({ en: 'Selecciona primer un estudi.', fr: 'Selecciona primero un estudio.' })}
        </p>
      ) : null}
      {groups
        .filter((group) => groupIds.includes(group.id))
        .map((group) => {
          const fullCatalog = getHospitalCatalog(group);
          const catalog = fullCatalog.filter((entry) => isTest || !entry.isInternal);
          const assignment = assignments.find((entry) => entry.groupId === group.id);
          const number = numbers?.find((entry) => entry.groupId === group.id);
          const value =
            catalog.find((entry) => entry.id === assignment?.hospitalId)?.name ??
            (!fullCatalog.length && group.hospitals.includes(legacyHospital) ? legacyHospital : '');
          return (
            <div className="min-w-0 space-y-2 rounded-md border p-3" key={group.id}>
              <Label>{group.name}</Label>
              {number ? (
                <p className="text-muted-foreground text-xs">
                  {t({ en: 'Codi d’investigador', fr: 'Código de investigador' })}: {number.isTest ? 'OR-TEST' : 'OR'}-
                  {String(number.number).padStart(2, '0')}
                </p>
              ) : null}
              <HospitalSelect
                ariaLabel={`${t({ en: 'Centre', fr: 'Centro' })} — ${group.name}`}
                options={
                  fullCatalog.length
                    ? catalog.map((entry) => entry.name)
                    : group.hospitals.filter((entry) => isTest || entry !== 'Alta Medical Services')
                }
                value={value}
                onValueChange={(name) => {
                  const hospital = catalog.find((entry) => entry.name === name);
                  const next = assignments.filter(
                    (entry) => entry.groupId !== group.id && groupIds.includes(entry.groupId)
                  );
                  if (hospital) next.push({ groupId: group.id, hospitalId: hospital.id });
                  onChange(next, name);
                }}
              />
              <Button type="button" variant="outline" disabled={disabled} onClick={() => onCreate(group.id)}>
                {t({ en: 'Afegir centre a aquest estudi', fr: 'Añadir centro a este estudio' })}
              </Button>
            </div>
          );
        })}
    </div>
  );
}
