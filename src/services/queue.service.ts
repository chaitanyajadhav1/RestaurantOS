import { prisma } from "@/lib/prisma";
import { PrismaClient, QueueStatus, QueuePriority } from '@prisma/client';



export class QueueService {
  /**
   * Generates a unique token for the day.
   * Format: N001 (Normal) or P001 (Priority)
   */
  static async generateToken(restaurantId: string, priority: QueuePriority): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await prisma.queueEntry.count({
      where: {
        restaurantId,
        priority,
        createdAt: {
          gte: today,
        },
      },
    });

    const nextNumber = count + 1;
    const prefix = priority === QueuePriority.PRIORITY ? 'P' : 'N';
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Joins the queue for a customer
   */
  static async joinQueue(data: {
    restaurantId: string;
    phone: string;
    name?: string;
    guests: number;
    preference?: string;
    priority?: QueuePriority;
  }) {
    const { restaurantId, phone, name, guests, preference, priority = QueuePriority.NORMAL } = data;

    // Check for existing active queue entry for this phone today
    const existingCustomer = await prisma.customer.findFirst({
      where: { restaurantId, phone }
    });

    if (existingCustomer) {
      const activeEntry = await prisma.queueEntry.findFirst({
        where: {
          restaurantId,
          customerId: existingCustomer.id,
          status: { in: [QueueStatus.WAITING, QueueStatus.CALLED] }
        }
      });

      if (activeEntry) {
        throw new Error('Customer is already in the active queue.');
      }
    }

    // Upsert Customer
    const customer = await prisma.customer.upsert({
      where: { restaurantId_phone: { restaurantId, phone } },
      update: { name },
      create: { restaurantId, phone, name }
    });

    const tokenNumber = await this.generateToken(restaurantId, priority);

    const queueEntry = await prisma.queueEntry.create({
      data: {
        restaurantId,
        customerId: customer.id,
        tokenNumber,
        guests,
        preference,
        priority,
        status: QueueStatus.WAITING
      }
    });

    return queueEntry;
  }

  /**
   * Gets the active queue for a restaurant
   */
  static async getActiveQueue(restaurantId: string) {
    return await prisma.queueEntry.findMany({
      where: {
        restaurantId,
        status: { in: [QueueStatus.WAITING, QueueStatus.CALLED] }
      },
      include: { customer: true },
      orderBy: [
        { priority: 'desc' }, // PRIORITY (which is technically sorted alphabetically? No, it's enum. Wait, enum sort might be creation order or alphabetical. Let's sort by createdAt inside priority)
        { createdAt: 'asc' }
      ]
    });
  }

  /**
   * Updates queue status
   */
  static async updateStatus(queueId: string, status: QueueStatus) {
    return await prisma.queueEntry.update({
      where: { id: queueId },
      data: { status }
    });
  }

  /**
   * Gets position and wait time for a specific entry
   */
  static async getQueuePosition(restaurantId: string, queueId: string) {
    const activeQueue = await this.getActiveQueue(restaurantId);
    
    // Sort logic in code to be 100% sure about PRIORITY vs NORMAL
    const sortedQueue = activeQueue.sort((a, b) => {
      if (a.priority === QueuePriority.PRIORITY && b.priority !== QueuePriority.PRIORITY) return -1;
      if (a.priority !== QueuePriority.PRIORITY && b.priority === QueuePriority.PRIORITY) return 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const positionIndex = sortedQueue.findIndex(q => q.id === queueId);
    
    if (positionIndex === -1) {
      return { position: 0, peopleAhead: 0, waitTimeMinutes: 0 };
    }

    const peopleAhead = positionIndex;
    // Assume 5 mins per table as default
    const waitTimeMinutes = peopleAhead * 5; 

    return { position: positionIndex + 1, peopleAhead, waitTimeMinutes };
  }
}
