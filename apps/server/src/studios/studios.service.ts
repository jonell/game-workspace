import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class StudiosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.studio.findMany({
      include: { _count: { select: { users: true, companions: true } } },
    });
  }

  async create(name: string) {
    return this.prisma.studio.create({ data: { name } });
  }

  async update(id: string, name: string) {
    return this.prisma.studio.update({ where: { id }, data: { name } });
  }

  async getEmployees(studioId: string) {
    return this.prisma.user.findMany({
      where: { studioId, role: { not: 'OWNER' } },
      include: {
        companion: { select: { id: true, status: true, monthlyRevenue: true, games: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEmployee(studioId: string, dto: { username: string; password: string; role: string }) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        role: dto.role,
        studioId,
        isAuthorized: dto.role === 'ADMIN',
        companion: dto.role === 'COMPANION'
          ? { create: { studioId, billingCode: `Z${Date.now().toString(36).toUpperCase()}` } }
          : undefined,
      },
    });
  }

  async resetPassword(userId: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
}
