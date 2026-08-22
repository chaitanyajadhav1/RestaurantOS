import { prisma } from "@/lib/prisma";
import { PrismaClient, OrderStatus, TableStatus, QueueStatus } from '@prisma/client';



export class BillingService {
  /**
   * Settles an order by creating a payment, completing the order, and freeing the table.
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
        where: { id: orderId, restaurantId }
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
          status: 'COMPLETED'
        }
      });

      // 3. Update Order Status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          status: OrderStatus.COMPLETED
        }
      });

      // 4. Free up the Table if Dine-in
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: TableStatus.AVAILABLE }
        });
      }

      // 5. Complete Queue Entry if linked
      if (order.queueId) {
        await tx.queueEntry.update({
          where: { id: order.queueId },
          data: { status: QueueStatus.COMPLETED }
        });
      }

      return { updatedOrder, payment };
    });
  }
}
