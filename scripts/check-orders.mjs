import { prisma } from "../src/lib/prisma";

async function main() {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: 'the-golden-spoon' }
  });

  if (!restaurant) {
    console.log("Restaurant not found");
    return;
  }

  const orders = await prisma.order.findMany({
    where: { restaurantId: restaurant.id },
    include: {
      table: true,
      customer: true,
      items: {
        include: { menuItem: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log(`Found ${orders.length} recent orders:`);
  orders.forEach(o => {
    console.log(`- Order #${o.id.slice(-6)} | Table: ${o.table?.number || 'NONE'} | Status: ${o.status} | Total: ₹${o.total} | Items: ${o.items.length} (${o.items.map(i => `${i.quantity}x ${i.menuItem.name}`).join(', ')})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
