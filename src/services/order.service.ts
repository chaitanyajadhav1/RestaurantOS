import { prisma } from "@/lib/prisma";
import { PrismaClient, OrderStatus } from '@prisma/client';



export class OrderService {
  /**
   * Adds items to an existing order or creates a new one
   */
  static async placeOrder(data: {
    restaurantId: string;
    customerId?: string;
    tableId?: string;
    queueId?: string;
    type: string; // 'DINE_IN' | 'TAKEAWAY'
    items: { menuItemId: string; quantity: number; specialInstructions?: string }[];
  }) {
    const { restaurantId, customerId, tableId, queueId, type, items } = data;

    // Calculate totals
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

    // Fetch tax settings from restaurant if any (default to 5% for MVP)
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    const taxRate = (restaurant?.settings as Record<string, unknown>)?.tax as number || 5;
    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax;

    let orderId: string;

    // Check if an open order already exists for this table/queue (from seating)
    let existingOrder = null;
    if (tableId) {
      existingOrder = await prisma.order.findFirst({
        where: {
          restaurantId,
          tableId,
          status: { in: [OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PREPARING] }
        }
      });
    }

    if (existingOrder) {
      // Add items to existing order
      orderId = existingOrder.id;
      
      await prisma.order.update({
        where: { id: orderId },
        data: {
          subtotal: existingOrder.subtotal + subtotal,
          tax: existingOrder.tax + tax,
          total: existingOrder.total + total,
        }
      });

      // Create order items
      await prisma.orderItem.createMany({
        data: itemDetails.map(item => ({
          orderId,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          specialInstructions: item.specialInstructions
        }))
      });

    } else {
      // Create new order
      const newOrder = await prisma.order.create({
        data: {
          restaurantId,
          customerId,
          tableId,
          queueId,
          type,
          status: OrderStatus.PLACED,
          subtotal,
          tax,
          total,
          items: {
            create: itemDetails.map(item => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: item.price,
              specialInstructions: item.specialInstructions
            }))
          }
        }
      });
      orderId = newOrder.id;
    }

    return await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { menuItem: true } } }
    });
  }

  /**
   * Update order status (used by Kitchen or Staff)
   */
  static async updateStatus(orderId: string, status: OrderStatus) {
    return await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });
  }
}
