import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import type { UserInfo, LoginResponse } from '@chunlv/shared';
import { UserRole } from '@chunlv/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: { companion: { select: { id: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const rolesRequiringAuth: UserRole[] = [UserRole.CS, UserRole.COMPANION];
    if (
      rolesRequiringAuth.includes(user.role as UserRole) &&
      !user.isAuthorized
    ) {
      throw new ForbiddenException('账号尚未通过审核，请联系管理员');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role as UserRole,
      studioId: user.studioId,
      companionId: user.companion?.id,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    const userInfo: UserInfo = {
      id: user.id,
      username: user.username,
      role: user.role as UserRole,
      studioId: user.studioId,
      companionId: user.companion?.id,
    };

    return {
      accessToken,
      refreshToken,
      user: userInfo,
    };
  }

  async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('refreshToken 无效或已过期');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { companion: { select: { id: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const newPayload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role as UserRole,
      studioId: user.studioId,
      companionId: user.companion?.id,
    };

    const accessToken = this.jwtService.sign(newPayload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(newPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  async authorizeUser(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isAuthorized: true },
    });
  }

  async verifySecondPassword(
    userId: string,
    password: string,
  ): Promise<{ secondToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.secondPasswordHash) {
      throw new UnauthorizedException('未设置二次密码');
    }

    const valid = await bcrypt.compare(password, user.secondPasswordHash);
    if (!valid) {
      throw new UnauthorizedException('二次密码错误');
    }

    const secondToken = this.jwtService.sign(
      { sub: user.id, secondVerified: true },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: '5m',
      },
    );

    return { secondToken };
  }
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
  studioId: string | null;
  companionId?: string;
}
