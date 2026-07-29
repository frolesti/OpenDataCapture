import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HOSPITAL_META_SEPARATOR = '|||';

type HospitalMetadata = {
  locality?: string;
  name: string;
  province?: string;
  state?: string;
};

function normalizeText(value?: string) {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

function deserializeHospital(raw: string): HospitalMetadata {
  if (raw.includes(HOSPITAL_META_SEPARATOR)) {
    const [name, locality, province, state] = raw.split(HOSPITAL_META_SEPARATOR).map(normalizeText);
    return { locality, name, province, state };
  }
  return { name: normalizeText(raw) };
}

function serializeHospital({ locality, name, province, state }: HospitalMetadata) {
  const normalizedName = normalizeText(name);
  if (!normalizedName) {
    return '';
  }

  const normalizedLocality = normalizeText(locality);
  const normalizedProvince = normalizeText(province);
  const normalizedState = normalizeText(state) || 'España';

  return [normalizedName, normalizedLocality, normalizedProvince, normalizedState].join(HOSPITAL_META_SEPARATOR);
}

function normalizeHospitals(rawHospitals: string[]) {
  return Array.from(new Set(rawHospitals.map((raw) => serializeHospital(deserializeHospital(raw))).filter(Boolean)));
}

async function main() {
  const groups = await prisma.group.findMany({
    select: {
      hospitals: true,
      id: true,
      name: true
    }
  });

  let updatedGroups = 0;

  for (const group of groups) {
    const normalizedHospitals = normalizeHospitals(group.hospitals);
    const hasChanges =
      normalizedHospitals.length !== group.hospitals.length ||
      normalizedHospitals.some((value, index) => value !== group.hospitals[index]);

    if (!hasChanges) {
      continue;
    }

    await prisma.group.update({
      data: {
        hospitals: normalizedHospitals
      },
      where: {
        id: group.id
      }
    });

    updatedGroups += 1;
    console.log(`Updated group ${group.name} (${group.id}) with ${normalizedHospitals.length} normalized hospitals`);
  }

  console.log(`Done. Updated ${updatedGroups}/${groups.length} groups.`);
}

main()
  .catch((error) => {
    console.error('Failed to normalize hospitals:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
