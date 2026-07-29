import type { Group } from '@opendatacapture/schemas/group';

export const HOSPITAL_META_SEPARATOR = '|||';

export type HospitalMetadata = {
  locality?: string;
  name: string;
  province?: string;
  state?: string;
};

export function deserializeHospital(raw: string): HospitalMetadata {
  if (raw.includes(HOSPITAL_META_SEPARATOR)) {
    const [name = '', locality, province, state] = raw.split(HOSPITAL_META_SEPARATOR).map((value) => value.trim());
    return { locality, name, province, state };
  }

  return { name: raw.trim() };
}

export function serializeHospital({ locality, name, province, state }: HospitalMetadata) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return '';
  }

  const trimmedLocality = locality?.trim();
  const trimmedProvince = province?.trim();
  const trimmedState = state?.trim();

  if (!trimmedLocality && !trimmedProvince && !trimmedState) {
    return trimmedName;
  }

  return [trimmedName, trimmedLocality ?? '', trimmedProvince ?? '', trimmedState ?? ''].join(HOSPITAL_META_SEPARATOR);
}

export function formatHospitalLabel(raw: string) {
  const hospital = deserializeHospital(raw);

  if (hospital.locality && hospital.province) {
    return `${hospital.name}, ${hospital.locality} (${hospital.province})`;
  }

  const location = hospital.locality ?? hospital.province;
  return location ? `${hospital.name}, ${location}` : hospital.name;
}

export function normalizeHospitals(values: Iterable<string>) {
  return Array.from(
    new Set(
      Array.from(values)
        .map((hospital) => hospital.trim())
        .filter(Boolean)
    )
  );
}

export function getHospitalsFromGroups(groups: Group[], excludedGroupId?: string) {
  return groups
    .filter((group) => group.id !== excludedGroupId)
    .flatMap((group) => group.hospitals)
    .map((hospital) => hospital.trim())
    .filter(Boolean);
}
