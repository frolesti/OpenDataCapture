import { PrismaClient, BasePermissionLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Delete all users except ADMINs
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      basePermissionLevel: {
        not: BasePermissionLevel.ADMIN
      }
    }
  });
  console.log(`Deleted ${deletedUsers.count} non-admin users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
