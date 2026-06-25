import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: any) {
    const where: any = {};
    if (user.role !== 'OWNER') where.studioId = user.studioId;
    return this.prisma.companion.findMany({
      where,
      include: {
        user: { select: { username: true } },
        pc: { select: { currentMode: true, isThrottled: true, lastHeartbeat: true } },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.companion.findUnique({
      where: { id },
      include: {
        user: { select: { username: true } },
        pc: true,
        timeLogs: { take: 20, orderBy: { startedAt: 'desc' } },
      },
    });
  }

  async updateStatus(id: string, status: string, user: any) {
    if (user.companionId !== id) throw new ForbiddenException('只能更新自己的状态');
    return this.prisma.companion.update({ where: { id }, data: { status } });
  }

  async getRanking(user: any) {
    const where: any = { monthlyRevenue: { gt: 0 } };
    if (user.role !== 'OWNER') where.studioId = user.studioId;
    return this.prisma.companion.findMany({
      where,
      orderBy: { monthlyRevenue: 'desc' },
      take: 20,
      select: {
        id: true,
        monthlyRevenue: true,
        user: { select: { username: true } },
      },
    });
  }

  async getRevenue(id: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { companionId: id, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      companionId: id,
      transactions,
      total: transactions.reduce((s: number, t: { amount: number }) => s + t.amount, 0),
    };
  }
}
