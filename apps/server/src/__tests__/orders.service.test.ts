import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { createMockPrisma, MockPrisma } from '../__mocks__/prisma.mock';
import { WsGateway } from '../ws/ws.gateway';
import { OrderStatus } from '@chunlv/shared';

function createMockWsGateway() {
  return {
    broadcastToStudio: vi.fn(),
    pushOrder: vi.fn(),
  } as unknown as WsGateway;
}

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: MockPrisma;
  let wsGateway: ReturnType<typeof createMockWsGateway>;

  beforeEach(() => {
    prisma = createMockPrisma();
    wsGateway = createMockWsGateway();
    service = new OrdersService(
      prisma as any,
      wsGateway as any,
    );
    vi.clearAllMocks();
  });

  // ─── create() ───────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      type: 'NEW',
      studioId: 'studio-1',
      csUserId: 'cs-1',
      customerId: 'customer-1',
      dispatchType: 'POOL',
      amount: 100,
      gameName: 'LOL',
      isOnline: true,
    };

    it('creates POOL order with status PENDING and null companionId', async () => {
      const created = { id: 'order-1', ...baseDto, status: 'PENDING', companionId: null };
      prisma.order.create.mockResolvedValue(created);

      const result = await service.create(baseDto);

      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companionId: null,
          status: 'PENDING',
          dispatchType: 'POOL',
        }),
        include: { customer: true },
      });
      expect(result.status).toBe('PENDING');
      expect(result.companionId).toBeNull();
      expect(wsGateway.broadcastToStudio).toHaveBeenCalledWith('studio-1', 'order:pool_updated', created);
    });

    it('creates DIRECT order with specified companionId', async () => {
      const dto = { ...baseDto, dispatchType: 'DIRECT', companionId: 'companion-1' };
      const created = { id: 'order-2', ...dto, status: 'PENDING' };
      prisma.order.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companionId: 'companion-1',
          status: 'PENDING',
          dispatchType: 'DIRECT',
        }),
        include: { customer: true },
      });
      expect(result.companionId).toBe('companion-1');
      // POOL broadcast should NOT be called for DIRECT orders
      expect(wsGateway.broadcastToStudio).not.toHaveBeenCalled();
    });
  });

  // ─── findPool() ─────────────────────────────────────────────

  describe('findPool', () => {
    it('returns only PENDING + POOL + unassigned orders', async () => {
      const poolOrders = [
        { id: 'o1', status: 'PENDING', dispatchType: 'POOL', companionId: null },
      ];
      prisma.order.findMany.mockResolvedValue(poolOrders);

      const result = await service.findPool();

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING', dispatchType: 'POOL', companionId: null },
        include: { customer: { select: { wechatId: true, customerCode: true } } },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(poolOrders);
    });
  });

  // ─── grab() ─────────────────────────────────────────────────

  describe('grab', () => {
    const orderId = 'order-1';
    const companionId = 'companion-1';

    it('companion grabs POOL order -> status GRABBED, companionId set', async () => {
      const pendingOrder = {
        id: orderId,
        status: 'PENDING' as const,
        dispatchType: 'POOL',
        companionId: null,
        studioId: 'studio-1',
      };
      const grabbedOrder = {
        ...pendingOrder,
        status: 'GRABBED' as const,
        companionId,
      };

      prisma.order.findUnique.mockResolvedValue(pendingOrder);
      prisma.order.update.mockResolvedValue(grabbedOrder);

      const result = await service.grab(orderId, companionId);

      expect(prisma.order.findUnique).toHaveBeenCalledWith({ where: { id: orderId } });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { status: OrderStatus.GRABBED, companionId },
      });
      expect(result.status).toBe('GRABBED');
      expect(result.companionId).toBe(companionId);
      expect(wsGateway.broadcastToStudio).toHaveBeenCalledWith('studio-1', 'order:pool_updated', grabbedOrder);
    });

    it('throws ForbiddenException when grabbing non-POOL order', async () => {
      const directOrder = {
        id: orderId,
        status: 'PENDING',
        dispatchType: 'DIRECT',
        companionId: null,
      };
      prisma.order.findUnique.mockResolvedValue(directOrder);

      await expect(service.grab(orderId, companionId)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when grabbing already-grabbed order', async () => {
      const alreadyGrabbed = {
        id: orderId,
        status: 'PENDING',
        dispatchType: 'POOL',
        companionId: 'other-companion', // already assigned
      };
      prisma.order.findUnique.mockResolvedValue(alreadyGrabbed);

      await expect(service.grab(orderId, companionId)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when grabbing non-existent order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.grab(orderId, companionId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── state machine validation ───────────────────────────────

  describe('state machine validation', () => {
    it('cannot grab CANCELLED order', async () => {
      const cancelledOrder = {
        id: 'order-1',
        status: OrderStatus.CANCELLED,
        dispatchType: 'POOL',
        companionId: null,
      };
      prisma.order.findUnique.mockResolvedValue(cancelledOrder);

      await expect(service.grab('order-1', 'companion-1')).rejects.toThrow(ForbiddenException);
    });

    it('cannot confirm un-grabbed order', async () => {
      const pendingOrder = {
        id: 'order-1',
        status: OrderStatus.PENDING,
        dispatchType: 'POOL',
        companionId: null,
      };
      prisma.order.findUnique.mockResolvedValue(pendingOrder);

      await expect(service.confirm('order-1', 'companion-1')).rejects.toThrow(ForbiddenException);
    });

    it('cannot complete un-confirmed order', async () => {
      const grabbedOrder = {
        id: 'order-1',
        status: OrderStatus.GRABBED,
        companionId: 'companion-1',
      };
      prisma.order.findUnique.mockResolvedValue(grabbedOrder);

      await expect(service.complete('order-1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── confirm() ──────────────────────────────────────────────

  describe('confirm', () => {
    it('companion confirms their own GRABBED order', async () => {
      const grabbedOrder = {
        id: 'order-1',
        status: OrderStatus.GRABBED,
        companionId: 'companion-1',
      };
      const confirmedOrder = { ...grabbedOrder, status: OrderStatus.CONFIRMED };

      prisma.order.findUnique.mockResolvedValue(grabbedOrder);
      prisma.order.update.mockResolvedValue(confirmedOrder);

      const result = await service.confirm('order-1', 'companion-1');

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.CONFIRMED },
      });
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });
  });

  // ─── complete() ─────────────────────────────────────────────

  describe('complete', () => {
    it('complete CONFIRMED order -> status DONE', async () => {
      const confirmedOrder = {
        id: 'order-1',
        status: OrderStatus.CONFIRMED,
        companionId: 'companion-1',
      };
      const doneOrder = { ...confirmedOrder, status: OrderStatus.DONE };

      prisma.order.findUnique.mockResolvedValue(confirmedOrder);
      prisma.order.update.mockResolvedValue(doneOrder);

      const result = await service.complete('order-1');

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.DONE },
      });
      expect(result.status).toBe(OrderStatus.DONE);
    });
  });

  // ─── cancel() ───────────────────────────────────────────────

  describe('cancel', () => {
    it('cancel PENDING order -> status CANCELLED', async () => {
      const pendingOrder = {
        id: 'order-1',
        status: OrderStatus.PENDING,
        companionId: null,
      };
      const cancelledOrder = { ...pendingOrder, status: OrderStatus.CANCELLED };

      prisma.order.findUnique.mockResolvedValue(pendingOrder);
      prisma.order.update.mockResolvedValue(cancelledOrder);

      const result = await service.cancel('order-1');

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.CANCELLED },
      });
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });
  });
});
