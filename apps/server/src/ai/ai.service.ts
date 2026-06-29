import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  async analyzeCustomer(customerId: string) {
    const [profile, customer, orders] = await Promise.all([
      this.prisma.customerProfile.findUnique({ where: { customerId } }),
      this.prisma.customer.findUnique({ where: { id: customerId } }),
      this.prisma.order.findMany({ where: { customerId, status: 'DONE' }, orderBy: { createdAt: 'desc' } }),
    ]);

    if (!customer) throw new NotFoundException('客户不存在');

    const rc = orders.length;
    const rr = rc > 0 ? Math.round((orders.filter(o => o.type === 'REPURCHASE').length / rc) * 100) : 0;
    const dsl = orders[0] ? Math.floor((Date.now() - orders[0].createdAt.getTime()) / 86400000) : 999;
    const sl = customer.totalSpent >= 500 ? 5 : customer.totalSpent >= 200 ? 3 : 1;
    const ll = rr >= 50 ? 5 : rr >= 30 ? 3 : 1;
    const al = dsl <= 3 ? '高' : dsl <= 7 ? '中' : '低';

    return {
      analysis: {
        spendingPower: { rating: sl },
        loyalty: { rating: ll },
        activity: { level: al, description: dsl <= 999 ? `${dsl}天前` : '无' },
        personality: profile?.customNotes || '暂无',
        interests: '暂无',
      },
      suggestions: {
        bestContactTime: profile?.preferredTime || '晚上20:00',
        recommendedStyle: profile?.likesTalkative ? '活泼型' : '高效型',
        nextRecommendation: rr >= 50 ? '推荐存单' : '提升服务',
      },
      scripts: {
        booking: '老板晚上好！今天来两把？',
        deposit: '老板要不要存个单？存10送2！',
        maintenance: '老板最近还好吗？有空一起打游戏～',
      },
    };
  }
}
