import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting cleanup of instruments...');

  // 1. Delete all Assignments
  // Assignments depend on Instruments.
  console.log('Deleting Assignments...');
  const deletedAssignments = await prisma.assignment.deleteMany({});
  console.log(`Deleted ${deletedAssignments.count} assignments.`);

  // 2. Delete all InstrumentRecords
  // InstrumentRecords depend on Instruments.
  console.log('Deleting InstrumentRecords...');
  const deletedRecords = await prisma.instrumentRecord.deleteMany({});
  console.log(`Deleted ${deletedRecords.count} instrument records.`);

  // 3. Update Groups to remove accessible instruments
  // Groups have a list of accessible instrument IDs.
  console.log('Updating Groups to remove accessible instruments...');
  const updatedGroups = await prisma.group.updateMany({
    data: {
      accessibleInstrumentIds: []
    }
  });
  console.log(`Updated ${updatedGroups.count} groups.`);

  // 4. Delete all Instruments
  console.log('Deleting Instruments...');
  const deletedInstruments = await prisma.instrument.deleteMany({});
  console.log(`Deleted ${deletedInstruments.count} instruments.`);

  console.log('Cleanup complete.');
}

main()
  .catch((e) => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
