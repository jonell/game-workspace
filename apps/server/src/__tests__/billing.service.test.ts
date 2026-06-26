import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { BillingService } from '../billing/billing.service';
import { createMockPrisma, type MockPrisma } from '../__mocks__/prisma.mock';

describe('BillingService', () => {
  let service: BillingService;
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new BillingService(mockPrisma as any);
    vi.clearAllMocks();
  });

  // ── Transaction management ──

  describe('createTransaction', () => {
    it('creates a PENDING transaction', async () => {
      const dto = {
        orderId: 'order-1',
        companionId: 'comp-1',
        amount: 100,
        paymentMethod: 'WECHAT',
        screenshotUrl: 'https://img.example.com/1.png',
        paidAt: '2026-06-25T10:00:00Z',
      };

      const mockTx = {
        id: 'tx-1',
        orderId: 'order-1',
        companionId: 'comp-1',
        amount: 100,
        paymentMethod: 'WECHAT',
        screenshotUrl: 'https://img.example.com/1.png',
        status: 'PENDING',
        paidAt: new Date('2026-06-25T10:00:00Z'),
        order: { id: 'order-1', type: 'NEW', amount: 100 },
        companion: { id: 'comp-1', user: { username: 'zhangsan' } },
      };

      mockPrisma.transaction.create.mockResolvedValue(mockTx);

      const result = await service.createTransaction(dto);

      expect(result).toEqual(mockTx);
      expect(result.status).toBe('PENDING');
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          companionId: 'comp-1',
          amount: 100,
          paymentMethod: 'WECHAT',
          screenshotUrl: 'https://img.example.com/1.png',
          status: 'PENDING',
          paidAt: new Date('2026-06-25T10:00:00Z'),
        }),
        include: expect.objectContaining({
          order: { select: { id: true, type: true, amount: true } },
          companion: {
            select: {
              id: true,
              user: { select: { username: true } },
            },
          },
        }),
      });
    });
  });

  describe('approve', () => {
    it('approves transaction to APPROVED and increments customer.totalSpent and companion.monthlyRevenue', async () => {
      const transactionId = 'tx-1';
      const reviewerId = 'reviewer-1';

      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: transactionId,
        amount: 100,
        companionId: 'comp-1',
        status: 'PENDING',
        order: { customerId: 'cust-1' },
      });

      mockPrisma.transaction.update.mockResolvedValue({
        id: transactionId,
        status: 'APPROVED',
        reviewedById: reviewerId,
      });

      const result = await service.approve(transactionId, reviewerId);

      expect(result.status).toBe('APPROVED');
      expect(result.reviewedById).toBe(reviewerId);

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { totalSpent: { increment: 100 } },
      });

      expect(mockPrisma.companion.update).toHaveBeenCalledWith({
        where: { id: 'comp-1' },
        data: { monthlyRevenue: { increment: 100 } },
      });
    });

    it('throws NotFoundException for missing transaction', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(
        service.approve('nonexistent', 'reviewer-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.approve('nonexistent', 'reviewer-1'),
      ).rejects.toThrow('报账记录不存在');
    });

    it('throws ForbiddenException for already-approved transaction', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        amount: 100,
        companionId: 'comp-1',
        status: 'APPROVED',
        order: { customerId: 'cust-1' },
      });

      await expect(
        service.approve('tx-1', 'reviewer-1'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.approve('tx-1', 'reviewer-1'),
      ).rejects.toThrow('该报账已处理');
    });
  });

  describe('reject', () => {
    it('rejects transaction to REJECTED', async () => {
      const transactionId = 'tx-1';
      const reviewerId = 'reviewer-1';

      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: transactionId,
        status: 'PENDING',
      });

      mockPrisma.transaction.update.mockResolvedValue({
        id: transactionId,
        status: 'REJECTED',
        reviewedById: reviewerId,
      });

      const result = await service.reject(transactionId, reviewerId);

      expect(result.status).toBe('REJECTED');
      expect(result.reviewedById).toBe(reviewerId);

      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: { status: 'REJECTED', reviewedById: reviewerId },
      });
    });
  });

  // ── Batch operations ──

  describe('batchApprove', () => {
    it('processes multiple transactions and returns succeeded/failed counts', async () => {
      const ids = ['tx-1', 'tx-2', 'tx-3'];
      const reviewerId = 'reviewer-1';

      // tx-1 succeeds
      mockPrisma.transaction.findUnique
        .mockResolvedValueOnce({
          id: 'tx-1',
          amount: 100,
          companionId: 'comp-1',
          status: 'PENDING',
          order: { customerId: 'cust-1' },
        });

      // tx-2 fails (already approved)
      mockPrisma.transaction.findUnique
        .mockResolvedValueOnce({
          id: 'tx-2',
          amount: 200,
          companionId: 'comp-2',
          status: 'APPROVED',
          order: { customerId: 'cust-2' },
        });

      // tx-3 succeeds
      mockPrisma.transaction.findUnique
        .mockResolvedValueOnce({
          id: 'tx-3',
          amount: 300,
          companionId: 'comp-3',
          status: 'PENDING',
          order: { customerId: 'cust-3' },
        });

      mockPrisma.transaction.update.mockResolvedValue({
        id: 'tx-1',
        status: 'APPROVED',
        reviewedById: reviewerId,
      });

      const result = await service.batchApprove(ids, reviewerId);

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('tx-2');
      expect(result.errors[0]).toContain('该报账已处理');
    });
  });

  // ── Revenue statistics ──

  describe('getDailyRevenue', () => {
    it('returns breakdown by order type with correct totals', async () => {
      const studioId = 'studio-1';
      const dateStr = '2026-06-25';

      mockPrisma.order.findMany.mockResolvedValue([
        { type: 'NEW', amount: 100 },
        { type: 'NEW', amount: 50 },
        { type: 'RENEW', amount: 200 },
        { type: 'TIP', amount: 30 },
        { type: 'TIP', amount: 20 },
      ]);

      const result = await service.getDailyRevenue(studioId, dateStr);

      expect(result.date).toBe('2026-06-25');
      expect(result.studioId).toBe(studioId);
      expect(result.breakdown.NEW).toEqual({ count: 2, amount: 150 });
      expect(result.breakdown.RENEW).toEqual({ count: 1, amount: 200 });
      expect(result.breakdown.REPURCHASE).toEqual({ count: 0, amount: 0 });
      expect(result.breakdown.TIP).toEqual({ count: 2, amount: 50 });
      expect(result.totalAmount).toBe(400);
    });
  });

  describe('getMonthlyRevenue', () => {
    it('returns companion revenue aggregation', async () => {
      const studioId = 'studio-1';
      const monthStr = '2026-06';

      mockPrisma.order.findMany.mockResolvedValue([
        {
          amount: 100,
          companionId: 'comp-1',
          companion: { user: { username: 'zhangsan' } },
        },
        {
          amount: 200,
          companionId: 'comp-2',
          companion: { user: { username: 'lisi' } },
        },
        {
          amount: 50,
          companionId: 'comp-1',
          companion: { user: { username: 'zhangsan' } },
        },
      ]);

      const result = await service.getMonthlyRevenue(studioId, monthStr);

      expect(result.month).toBe('2026-06');
      expect(result.studioId).toBe(studioId);
      expect(result.totalAmount).toBe(350);
      expect(result.companionRevenue).toEqual(
        expect.arrayContaining([
          { name: 'zhangsan', amount: 150 },
          { name: 'lisi', amount: 200 },
        ]),
      );
    });
  });

  describe('getProfitLoss', () => {
    it('returns revenue minus expenses', async () => {
      const studioId = 'studio-1';

      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { amount: 5000 },
      });

      mockPrisma.expense.aggregate.mockResolvedValue({
        _sum: { amount: 1200 },
      });

      const result = await service.getProfitLoss(studioId);

      expect(result.totalRevenue).toBe(5000);
      expect(result.totalExpense).toBe(1200);
      expect(result.profit).toBe(3800);
      expect(result.studioId).toBe(studioId);

      // Verify it uses current month date range
      const now = new Date();
      const expectedMonth =
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      expect(result.month).toBe(expectedMonth);
    });
  });

  // ── Expense management ──

  describe('createExpense', () => {
    it('creates expense record', async () => {
      const studioId = 'studio-1';
      const dto = {
        category: 'RENT',
        amount: 3000,
        description: 'Monthly office rent',
      };

      const mockExpense = {
        id: 'exp-1',
        studioId,
        category: 'RENT',
        amount: 3000,
        description: 'Monthly office rent',
        date: new Date(),
      };

      mockPrisma.expense.create.mockResolvedValue(mockExpense);

      const result = await service.createExpense(studioId, dto);

      expect(result).toEqual(mockExpense);
      expect(mockPrisma.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          studioId,
          category: 'RENT',
          amount: 3000,
          description: 'Monthly office rent',
        }),
      });
    });
  });
});
