import { Heading } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { Group } from '@opendatacapture/schemas/group';

import { formatHospitalLabel, getHospitalsFromGroups } from './hospitals';

type SharedHospitalCatalogProps = {
  groups: Group[];
  excludedGroupId?: string;
  title?: string;
};

export const SharedHospitalCatalog = ({
  excludedGroupId,
  groups,
  title = "Hospitales d'altres grups"
}: SharedHospitalCatalogProps) => {
  const { t } = useTranslation();
  const hospitals = getHospitalsFromGroups(groups, excludedGroupId);

  if (!hospitals.length) {
    return null;
  }

  const groupedHospitals = groups
    .filter((group) => group.id !== excludedGroupId && group.hospitals.length)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="bg-muted/20 rounded-2xl border p-4">
      <header className="mb-3">
        <Heading variant="h4">{title}</Heading>
        <p className="text-muted-foreground text-sm">
          {t({
            en: "Consulta els hospitals que ja s'usen a altres grups per evitar duplicats.",
            fr: 'Consulta los hospitales que ya se usan en otros grupos para evitar duplicados.'
          })}
        </p>
      </header>

      <div className="grid gap-3">
        {groupedHospitals.map((group) => (
          <article key={group.id} className="bg-background rounded-xl border p-3">
            <p className="text-foreground mb-2 text-sm font-medium">{group.name}</p>
            <div className="flex flex-wrap gap-2">
              {group.hospitals.map((hospital) => (
                <span key={`${group.id}-${hospital}`} className="bg-muted rounded-full border px-3 py-1 text-sm">
                  {formatHospitalLabel(hospital)}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
