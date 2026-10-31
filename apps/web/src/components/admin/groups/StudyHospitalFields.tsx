import { useEffect, useMemo, useState } from 'react';

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

function hospitalOptions(group: HospitalGroup) {
  const catalog = getHospitalCatalog(group);
  return catalog.length ? catalog : group.hospitals.map((name) => ({ id: `legacy:${name}`, name, isInternal: false }));
}

export function getCommonHospitals(groups: HospitalGroup[]) {
  return groups.length
    ? hospitalOptions(groups[0]!).filter((hospital) =>
        groups.every((group) => hospitalOptions(group).some((entry) => entry.id === hospital.id))
      )
    : [];
}

export function hasCompleteStudyHospitals(
  groups: HospitalGroup[],
  groupIds: string[],
  assignments: StudyHospital[],
  legacyHospital: string
) {
  return groupIds.every((id) => {
    const group = groups.find((entry) => entry.id === id);
    if (!group) return false;
    const catalog = getHospitalCatalog(group);
    if (!catalog.length) return !group.hospitals.length || group.hospitals.includes(legacyHospital);
    const assignment = assignments.find((entry) => entry.groupId === id);
    return catalog.some((entry) => entry.id === assignment?.hospitalId);
  });
}

export function StudyHospitalFields({
  groups,
  groupIds,
  assignments,
  legacyHospital,
  onChange,
  onCreate,
  numbers,
  disabled
}: {
  groups: HospitalGroup[];
  groupIds: string[];
  assignments: StudyHospital[];
  legacyHospital: string;
  onChange: (assignments: StudyHospital[], legacyHospital: string) => void;
  onCreate: (groupId: string) => void;
  numbers?: { groupId: string; number: number }[];
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const selectedGroups = useMemo(() => groups.filter((group) => groupIds.includes(group.id)), [groups, groupIds]);
  const assignedHospital = (group: HospitalGroup) =>
    hospitalOptions(group).find(
      (entry) => entry.id === assignments.find((assignment) => assignment.groupId === group.id)?.hospitalId
    ) ?? hospitalOptions(group).find((entry) => entry.name === legacyHospital);
  const commonHospitals = getCommonHospitals(selectedGroups);
  const assignedIds = selectedGroups.map((group) => assignedHospital(group)?.id).filter(Boolean);
  const [useDifferentCentres, setUseDifferentCentres] = useState<boolean | null>(null);
  const hasDifferentCentres = new Set(assignedIds).size > 1;
  const separate =
    (useDifferentCentres ?? hasDifferentCentres) || (selectedGroups.length > 1 && commonHospitals.length === 0);
  const commonValue =
    new Set(assignedIds).size === 1 ? (commonHospitals.find((entry) => entry.id === assignedIds[0])?.name ?? '') : '';

  const selectCommonHospital = (name: string) => {
    const selected = commonHospitals.find((entry) => entry.name === name);
    const next = selectedGroups.flatMap((group) => {
      const hospital = getHospitalCatalog(group).find((entry) => entry.id === selected?.id);
      return hospital ? [{ groupId: group.id, hospitalId: hospital.id }] : [];
    });
    if (JSON.stringify(next) !== JSON.stringify(assignments) || legacyHospital !== name) {
      onChange(next, name);
    }
  };

  useEffect(() => {
    if (!disabled && !separate && selectedGroups.length === groupIds.length) {
      const name = commonValue || (commonHospitals.length === 1 ? commonHospitals[0]!.name : '');
      if (name) selectCommonHospital(name);
    }
  }, [selectedGroups, groupIds, assignments, legacyHospital, separate, onChange, disabled]);

  return (
    <div className="min-w-0 space-y-3">
      <p className="text-sm font-medium">{t({ en: 'Centre sanitari', fr: 'Centro sanitario' })}</p>
      {selectedGroups.length > 1 && commonHospitals.length > 0 ? (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={separate}
            disabled={disabled}
            onCheckedChange={(checked) => {
              setUseDifferentCentres(checked === true);
              if (checked !== true)
                selectCommonHospital(commonValue || (commonHospitals.length === 1 ? commonHospitals[0]!.name : ''));
            }}
          />
          {t({ en: 'Assignar centres diferents per estudi', fr: 'Asignar centros distintos por estudio' })}
        </label>
      ) : null}
      {groupIds.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          {t({ en: 'Selecciona primer un estudi.', fr: 'Selecciona primero un estudio.' })}
        </p>
      ) : null}
      {!separate && selectedGroups.length > 0 ? (
        <HospitalSelect
          ariaLabel={t({ en: 'Centre comú als estudis seleccionats', fr: 'Centro común a los estudios seleccionados' })}
          options={commonHospitals.map((entry) => entry.name)}
          value={commonValue}
          disabled={disabled}
          onValueChange={selectCommonHospital}
        />
      ) : null}
      {separate && commonHospitals.length === 0 && selectedGroups.length > 1 ? (
        <p className="text-muted-foreground text-xs">
          {t({
            en: 'Els estudis no tenen cap centre comú. Selecciona un centre per estudi.',
            fr: 'Los estudios no tienen ningún centro común. Selecciona un centro por estudio.'
          })}
        </p>
      ) : null}
      {selectedGroups.map((group) => {
        const fullCatalog = getHospitalCatalog(group);
        const catalog = fullCatalog;
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
                {t({ en: 'Número d’investigador', fr: 'Número de investigador' })}:{' '}
                {String(number.number).padStart(2, '0')}
              </p>
            ) : null}
            {separate ? (
              <HospitalSelect
                ariaLabel={`${t({ en: 'Centre', fr: 'Centro' })} — ${group.name}`}
                options={fullCatalog.length ? catalog.map((entry) => entry.name) : group.hospitals}
                value={value}
                disabled={disabled}
                onValueChange={(name) => {
                  const hospital = catalog.find((entry) => entry.name === name);
                  const next = assignments.filter(
                    (entry) => entry.groupId !== group.id && groupIds.includes(entry.groupId)
                  );
                  if (hospital) next.push({ groupId: group.id, hospitalId: hospital.id });
                  onChange(next, name);
                }}
              />
            ) : null}
            <Button type="button" variant="outline" disabled={disabled} onClick={() => onCreate(group.id)}>
              {t({ en: 'Afegir centre a aquest estudi', fr: 'Añadir centro a este estudio' })}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
