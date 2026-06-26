import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompanionsService } from '../companions/companions.service';
import { ForbiddenException } from '@nestjs/common';
import { createMockPrisma, type MockPrisma } from '../__mocks__/prisma.mock';

describe('CompanionsService', () => {
  let service: CompanionsService;
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new CompanionsService(mockPrisma as any);
  });

  describe('findAll', () => {
    it('returns companions with PC status', async () => {
      const user = {
        id: 'u1',
        username: 'admin',
        role: 'ADMIN' as const,
        studioId: 'studio-1',
      };

      const companions = [
        {
          id: 'comp-1',
          status: 'ONLINE',
          user: { username: 'zhangsan' },
          pc: { currentMode: 'AUTO', isThrottled: false, lastHeartbeat: '2024-01-01T00:00:00Z' },
        },
      ];

      mockPrisma.companion.findMany.mockResolvedValue(companions);

      const result = await service.findAll(user);

      expect(mockPrisma.companion.findMany).toHaveBeenCalledWith({
        where: { studioId: 'studio-1' },
        include: {
          user: { select: { username: true } },
          pc: { select: { currentMode: true, isThrottled: true, lastHeartbeat: true } },
        },
      });
      expect(result).toEqual(companions);
    });
  });

  describe('updateStatus', () => {
    it('companion updates own status', async () => {
      const companionUser = {
        id: 'u5',
        username: 'zhangsan',
        role: 'COMPANION' as const,
        studioId: 'studio-1',
        companionId: 'comp-1',
      };

      const updatedCompanion = { id: 'comp-1', status: 'BUSY' };
      mockPrisma.companion.update.mockResolvedValue(updatedCompanion);

      const result = await service.updateStatus('comp-1', 'BUSY', companionUser);

      expect(mockPrisma.companion.update).toHaveBeenCalledWith({
        where: { id: 'comp-1' },
        data: { status: 'BUSY' },
      });
      expect(result).toEqual(updatedCompanion);
    });

    it('throws ForbiddenException when updating other\'s status', async () => {
      const otherUser = {
        id: 'u3',
        username: 'admin',
        role: 'ADMIN' as const,
        studioId: 'studio-1',
        companionId: undefined,
      };

      await expect(
        service.updateStatus('comp-1', 'BUSY', otherUser),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.updateStatus('comp-1', 'BUSY', otherUser),
      ).rejects.toThrow('只能更新自己的状态');

      // Also test a user with a different companionId
      const otherCompanionUser = {
        id: 'u4',
        username: 'lisi',
        role: 'COMPANION' as const,
        studioId: 'studio-1',
        companionId: 'comp-2',
      };

      await expect(
        service.updateStatus('comp-1', 'BUSY', otherCompanionUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getRanking', () => {
    it('returns top 20 by monthlyRevenue', async () => {
      const user = {
        id: 'u1',
        username: 'owner',
        role: 'OWNER' as const,
        studioId: null,
      };

      const ranking = [
        { id: 'comp-1', monthlyRevenue: 5000, user: { username: 'zhangsan' } },
        { id: 'comp-2', monthlyRevenue: 3000, user: { username: 'lisi' } },
      ];

      mockPrisma.companion.findMany.mockResolvedValue(ranking);

      const result = await service.getRanking(user);

      expect(mockPrisma.companion.findMany).toHaveBeenCalledWith({
        where: { monthlyRevenue: { gt: 0 } },
        orderBy: { monthlyRevenue: 'desc' },
        take: 20,
        select: {
          id: true,
          monthlyRevenue: true,
          user: { select: { username: true } },
        },
      });
      expect(result).toEqual(ranking);
    });
  });

  describe('getRevenue', () => {
    it('aggregates approved transactions', async () => {
      const transactions = [
        { id: 't1', companionId: 'comp-1', amount: 100, status: 'APPROVED' },
        { id: 't2', companionId: 'comp-1', amount: 200, status: 'APPROVED' },
        { id: 't3', companionId: 'comp-1', amount: 50, status: 'APPROVED' },
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(transactions);

      const result = await service.getRevenue('comp-1');

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: { companionId: 'comp-1', status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      expect(result).toEqual({
        companionId: 'comp-1',
        transactions,
        total: 350,
      });
    });
  });
});
