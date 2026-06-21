import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/auth.service';

interface ConnectedUser {
  id: string;
  username: string;
  role: string;
  studioId: string | null;
  companionId?: string;
}

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  /** companionId -> socketId */
  private companionSockets = new Map<string, string>();

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // ── lifecycle ──────────────────────────────────────────────────────

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });

      const user: ConnectedUser = {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
        studioId: payload.studioId,
        companionId: payload.companionId,
      };
      client.data.user = user;

      // join rooms
      if (user.studioId) {
        void client.join(`studio:${user.studioId}`);
      }
      if (user.companionId) {
        void client.join(`companion:${user.companionId}`);
        void client.join(`pc:${user.companionId}`);

        // track mapping
        this.companionSockets.set(user.companionId, client.id);

        // mark ONLINE
        await this.prisma.companion.update({
          where: { id: user.companionId },
          data: { status: 'ONLINE' },
        });

        // broadcast to studio
        if (user.studioId) {
          this.server
            .to(`studio:${user.studioId}`)
            .emit('status:broadcast', {
              companionId: user.companionId,
              status: 'ONLINE',
            });
        }
      }
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const user = client.data.user as ConnectedUser | undefined;
    if (!user?.companionId) return;

    this.companionSockets.delete(user.companionId);

    await this.prisma.companion
      .update({
        where: { id: user.companionId },
        data: { status: 'OFFLINE' },
      })
      .catch(() => null);

    if (user.studioId) {
      this.server
        .to(`studio:${user.studioId}`)
        .emit('status:broadcast', {
          companionId: user.companionId,
          status: 'OFFLINE',
        });
    }
  }

  // ── inbound ────────────────────────────────────────────────────────

  @SubscribeMessage('companion:status')
  async handleStatusChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { status: string; mode?: string },
  ): Promise<void> {
    const user = client.data.user as ConnectedUser | undefined;
    if (!user?.companionId) return;

    await this.prisma.companion
      .update({
        where: { id: user.companionId },
        data: { status: data.status },
      })
      .catch(() => null);

    if (user.studioId) {
      this.server
        .to(`studio:${user.studioId}`)
        .emit('status:broadcast', {
          companionId: user.companionId,
          status: data.status,
          mode: data.mode,
        });
    }
  }

  @SubscribeMessage('companion:heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      agentVersion?: string;
      currentMode?: string;
      workSec?: number;
      isThrottled?: boolean;
      throttleLimitKB?: number;
    },
  ): Promise<void> {
    const user = client.data.user as ConnectedUser | undefined;
    if (!user?.companionId) return;

    // upsert CompanionPC
    await this.prisma.companionPC.upsert({
      where: { companionId: user.companionId },
      create: {
        companionId: user.companionId,
        agentVersion: data.agentVersion ?? '0.0.0',
        lastHeartbeat: new Date(),
        currentMode: data.currentMode ?? 'ENTERTAINMENT',
        isThrottled: data.isThrottled ?? false,
        throttleLimitKB: data.throttleLimitKB ?? null,
      },
      update: {
        agentVersion: data.agentVersion ?? undefined,
        lastHeartbeat: new Date(),
        currentMode: data.currentMode ?? undefined,
        isThrottled: data.isThrottled ?? undefined,
        throttleLimitKB: data.throttleLimitKB ?? undefined,
      },
    });

    // create time-log when workSec is reported
    if (data.workSec && data.workSec > 0) {
      const now = new Date();
      await this.prisma.companionTimeLog.create({
        data: {
          companionId: user.companionId,
          mode: data.currentMode ?? 'ENTERTAINMENT',
          startedAt: new Date(now.getTime() - data.workSec * 1000),
          endedAt: now,
          durationSeconds: data.workSec,
        },
      });
    }
  }

  @SubscribeMessage('pc:command_ack')
  async handleCommandAck(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { command: string; success: boolean },
  ): Promise<void> {
    const user = client.data.user as ConnectedUser | undefined;
    if (!user?.companionId) return;

    // lookup the PC row by companionId
    const pc = await this.prisma.companionPC.findUnique({
      where: { companionId: user.companionId },
    });
    if (!pc) return;

    await this.prisma.pCOperationLog.create({
      data: {
        pcId: pc.id,
        operation: data.command,
        operatorId: user.id,
        detail: JSON.stringify({ success: data.success }),
      },
    });
  }

  // ── outbound ───────────────────────────────────────────────────────

  /** Send a command to a specific companion's PC agent. */
  sendCommand(
    companionId: string,
    command: string,
    params?: unknown,
  ): void {
    const socketId = this.companionSockets.get(companionId);
    if (!socketId) return;

    this.server.to(socketId).emit('pc:command', { command, params });
  }

  /** Push a new order to a specific companion. */
  pushOrder(companionId: string, order: unknown): void {
    const socketId = this.companionSockets.get(companionId);
    if (!socketId) return;

    this.server.to(socketId).emit('order:new', order);
  }

  /** Broadcast an event to all users in a studio room. */
  broadcastToStudio(studioId: string, event: string, data: unknown): void {
    this.server.to(`studio:${studioId}`).emit(event, data);
  }
}
