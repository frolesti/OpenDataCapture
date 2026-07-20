import { PrismaClient } from '@prisma/client';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGO_DB_NAME ?? 'data-capture-development';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `${MONGO_URI}/${DB_NAME}`
    }
  }
});

const TARGET_GROUP_NAME = process.env.TARGET_GROUP_NAME ?? 'Alta Health Services';

// Canonical list of 32 hospitals for the first study (extracted from the osteoporosis
// instrument commit f07121e7 "feat: update centros sanitarios list (32 definitive centers)"
// with the later replacement from commit 652b0141 "chore: replace CS La Magdalena with
// Consultorio de Villaobispo de las Regueras (León)").
const HOSPITALS = [
  'CAP Badia',
  'CAP Numància',
  'CAP Sant Martí',
  'CAP Manso',
  'CS Acea da Ma',
  'CS Aravaca',
  'CS Xunqueira de Ambía',
  'CS Villoria',
  'CS Tórtola',
  'CS Ávila Norte',
  'CS Casco Vello',
  'Consultorio de Jayena',
  'CS Ribadavia',
  'CS Arturo Eyries',
  'CS Ensanche de Vallecas',
  'CS Vinaròs',
  'CS Monforte de Lemos',
  'CS José Aguado',
  'Consultorio de Villaobispo de las Regueras (León)',
  'UGC Aguadulce - El Parador',
  'CS Cartaya',
  'CS Fuencarral',
  'CS Brújula',
  'Consultorio Local Fontanars Dels Alforins',
  'CS María Fuensanta Pérez Quirós',
  'CS Santa Marta de Tormes',
  'CS A Ponte',
  'CS V Centenario',
  'CS Sector III',
  "Consultori La Platja d'Almenara",
  'CS de La Eliana',
  'CAP Sant Llàtzer'
];

async function main() {
  const group = await prisma.group.findFirst({
    where: { name: TARGET_GROUP_NAME }
  });

  if (!group) {
    console.error(`Group not found: ${TARGET_GROUP_NAME}`);
    process.exit(1);
  }

  const merged = Array.from(new Set([...group.hospitals, ...HOSPITALS]))
    .map((value) => value.trim())
    .filter(Boolean);

  await prisma.group.update({
    data: { hospitals: merged },
    where: { id: group.id }
  });

  console.log(`Updated group "${group.name}" (${group.id}) with ${merged.length} hospitals.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
