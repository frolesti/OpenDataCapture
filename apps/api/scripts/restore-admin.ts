import { PrismaClient, BasePermissionLevel, Sex } from '@prisma/client';
import { CryptoService } from '@douglasneuroinformatics/libnest';

const prisma = new PrismaClient();
const crypto = new CryptoService({});

async function main() {
  const username = 'frolesti';
  const password = 'FRoy116699';

  console.log(`Restoring admin user: ${username}`);

  // Check if user exists
  const existing = await prisma.user.findFirst({ where: { username } });
  if (existing) {
    console.log('User already exists, updating password...');
    const hashedPassword = await crypto.hashPassword(password);
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        hashedPassword,
        basePermissionLevel: BasePermissionLevel.ADMIN
      }
    });
    console.log('User updated.');
    return;
  }

  const hashedPassword = await crypto.hashPassword(password);

  const user = await prisma.user.create({
    data: {
      username,
      hashedPassword,
      firstName: 'Froilán',
      lastName: 'Olesti',
      basePermissionLevel: BasePermissionLevel.ADMIN,
      sex: Sex.MALE,
      dateOfBirth: new Date('1992-03-10')
      // We don't strictly need groups for the admin to login and create users
    }
  });

  console.log(`Admin user created: ${user.username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
