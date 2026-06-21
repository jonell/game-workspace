import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  const owner = await prisma.user.create({
    data: {
      username: 'hanlei',
      passwordHash,
      role: 'OWNER',
      isAuthorized: true,
      secondPasswordHash: await bcrypt.hash('888888', 10),
    },
  });

  const studio = await prisma.studio.create({
    data: { name: '工作室A' },
  });

  const companionUser = await prisma.user.create({
    data: {
      username: 'zhangsan',
      passwordHash,
      role: 'COMPANION',
      studioId: studio.id,
      isAuthorized: true,
      companion: {
        create: {
          studioId: studio.id,
          games: ['英雄联盟', '王者荣耀'],
          billingCode: 'Z001',
        },
      },
    },
  });

  const cs = await prisma.user.create({
    data: {
      username: 'kefu01',
      passwordHash,
      role: 'CS',
      studioId: studio.id,
      isAuthorized: true,
    },
  });

  console.log('Seed complete:', {
    ownerId: owner.id,
    studioId: studio.id,
    companionId: companionUser.id,
    csId: cs.id,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
