import { prisma } from "@/lib/prisma";
import { OrderStatus, TableStatus, QueueStatus } from '@prisma/client';

export class BillingService {
  /**
   * Settles an order by creating a payment, completing the order, and updating table occupancy.
   * Supports Shared Tables: only frees the entire table if all seated parties have settled.
   */
  static async settleOrder(data: {
    restaurantId: string;
    orderId: string;
    amount: number;
    method: string;
  }) {
    const { restaurantId, orderId, amount, method } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Get the order
      const order = await tx.order.findUnique({
        where: { id: orderId, restaurantId },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.paymentStatus === 'PAID') {
        throw new Error('Order is already paid');
      }

      // 2. Create Payment
      const payment = await tx.payment.create({
        data: {
          restaurantId,
          orderId,
          amount,
          method,
          status: 'COMPLETED',
        },
      });

      // 3. Update Order Status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          status: OrderStatus.COMPLETED,
        },
      });

      // 4. Update Table State for Dine-In (Handles Shared Tables)
      if (order.tableId) {
        const remainingActiveOrders = await tx.order.findMany({
          where: {
            tableId: order.tableId,
            id: { not: orderId },
            status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] },
          },
        });

        if (remainingActiveOrders.length > 0) {
          // Other parties are still dining at this shared table!
          const table = await tx.table.findUnique({ where: { id: order.tableId } });
          const remainingOccupiedSeats = remainingActiveOrders.reduce(
            (sum, o) => sum + (o.guestCount || 1),
            0
          );

          const newTableStatus =
            table && remainingOccupiedSeats >= table.capacity
              ? TableStatus.OCCUPIED
              : TableStatus.PARTIALLY_OCCUPIED;

          await tx.table.update({
            where: { id: order.tableId },
            data: { status: newTableStatus },
          });
        } else {
          // All parties on this table have finished dining
          await tx.table.update({
            where: { id: order.tableId },
            data: { status: TableStatus.AVAILABLE },
          });
        }
      }

      // 5. Complete Queue Entry if linked
      if (order.queueId) {
        await tx.queueEntry.update({
          where: { id: order.queueId },
          data: { status: QueueStatus.COMPLETED },
        });
      }

      return { updatedOrder, payment };
    });
  }
}
