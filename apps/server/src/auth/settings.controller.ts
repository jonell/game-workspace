import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard, Roles } from './roles.guard';
import { UserRole } from '@chunlv/shared';
import type { ApiResponse } from '@chunlv/shared';

// 默认配置
const DEFAULT_GAMES = ['英雄联盟', '王者荣耀', '无畏契约', 'CS2', 'DOTA2', '永劫无间', '绝地求生', 'Apex英雄'];
const DEFAULT_RANKS = ['青铜', '白银', '黄金', '铂金', '钻石', '大师', '宗师', '王者'];

@Controller()
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  // 获取系统配置（游戏列表、段位列表）—— 公开接口，注册页需要
  @Get('settings')
  async getSettings(): Promise<ApiResponse<unknown>> {
    const [gameCfg, rankCfg] = await Promise.all([
      this.prisma.systemConfig.findUnique({ where: { key: 'games' } }),
      this.prisma.systemConfig.findUnique({ where: { key: 'ranks' } }),
    ]);
    return {
      code: 200, message: 'ok',
      data: {
        games: (gameCfg?.value as string[]) ?? DEFAULT_GAMES,
        ranks: (rankCfg?.value as string[]) ?? DEFAULT_RANKS,
      },
    };
  }

  // 管理端更新系统配置
  @Put('settings')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async updateSettings(@Body() body: { games?: string[]; ranks?: string[] }): Promise<ApiResponse<unknown>> {
    const ops: any[] = [];
    if (body.games) {
      ops.push(this.prisma.systemConfig.upsert({
        where: { key: 'games' }, create: { key: 'games', value: body.games }, update: { value: body.games },
      }));
    }
    if (body.ranks) {
      ops.push(this.prisma.systemConfig.upsert({
        where: { key: 'ranks' }, create: { key: 'ranks', value: body.ranks }, update: { value: body.ranks },
      }));
    }
    await Promise.all(ops);
    return { code: 200, message: '配置已更新', data: null };
  }
}
