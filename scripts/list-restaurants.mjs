import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const restaurants = await prisma.restaurant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          tables: true,
          users: true,
          orders: true,
          queueEntries: true
        }
      }
    }
  });

  console.log('--- ALL RESTAURANTS IN DATABASE ---');
  console.log(JSON.stringify(restaurants, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
