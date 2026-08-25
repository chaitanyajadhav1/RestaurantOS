import { prisma } from "@/lib/prisma";
import { OrderStatus } from '@prisma/client';

export class OrderService {
  /**
   * Adds items to an existing party order or creates a new one (Supports Shared Tables)
   */
  static async placeOrder(data: {
    restaurantId: string;
    orderId?: string;
    customerId?: string;
    tableId?: string;
    queueId?: string;
    partyLabel?: string;
    guestCount?: number;
    groupName?: string;
    type: string; // 'DINE_IN' | 'TAKEAWAY'
    items: { menuItemId: string; quantity: number; specialInstructions?: string }[];
  }) {
    const { 
      restaurantId, 
      orderId: explicitOrderId, 
      customerId, 
      tableId, 
      queueId, 
      partyLabel = "A", 
      guestCount = 1,
      groupName,
      type, 
      items 
    } = data;

    // 1. Calculate item details and subtotal
    let subtotal = 0;
    const itemDetails = await Promise.all(
      items.map(async (item) => {
        const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
        if (!menuItem) throw new Error(`Menu item ${item.menuItemId} not found`);
        subtotal += menuItem.price * item.quantity;
        return {
          ...item,
          price: menuItem.price,
        };
      })
    );

    // 2. Fetch tax settings from restaurant if any (default to 5%)
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    const taxRate = ((restaurant?.settings as Record<string, unknown>)?.tax as number) || 5;
    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax;

    let targetOrderId: string;

    // 3. Find existing open order for this exact party or table
    let existingOrder = null;

    if (explicitOrderId) {
      existingOrder = await prisma.order.findUnique({
        where: { id: explicitOrderId },
      });
    } else if (tableId) {
      existingOrder = await prisma.order.findFirst({
        where: {
          restaurantId,
          tableId,
          partyLabel: partyLabel || "A",
          status: { in: [OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PREPARING] },
        },
      });
    }

    if (existingOrder) {
      // Add items to existing party order
      targetOrderId = existingOrder.id;

      await prisma.order.update({
        where: { id: targetOrderId },
        data: {
          subtotal: existingOrder.subtotal + subtotal,
          tax: existingOrder.tax + tax,
          total: existingOrder.total + total,
        },
      });

      // Create order items
      await prisma.orderItem.createMany({
        data: itemDetails.map((item) => ({
          orderId: targetOrderId,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          specialInstructions: item.specialInstructions,
        })),
      });
    } else {
      // Create new party order
      const newOrder = await prisma.order.create({
        data: {
          restaurantId,
          customerId,
          tableId,
          queueId,
          partyLabel: partyLabel || "A",
          guestCount: guestCount || 1,
          groupName: groupName || (partyLabel ? `Party ${partyLabel}` : undefined),
          type,
          status: OrderStatus.PLACED,
          subtotal,
          tax,
          total,
          items: {
            create: itemDetails.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: item.price,
              specialInstructions: item.specialInstructions,
            })),
          },
        },
      });
      targetOrderId = newOrder.id;
    }

    return await prisma.order.findUnique({
      where: { id: targetOrderId },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
    });
  }

  /**
   * Update order status (used by Kitchen or Staff)
   */
  static async updateStatus(orderId: string, status: OrderStatus) {
    return await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }
}
