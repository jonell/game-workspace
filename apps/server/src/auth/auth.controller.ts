import { Controller, Post, Get, Body, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, VerifySecondDto } from './dto/login.dto';
import type { ApiResponse, LoginResponse, UserInfo } from '@chunlv/shared';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<ApiResponse<LoginResponse>> {
    const data = await this.authService.login(dto);
    return { code: 200, message: 'ok', data };
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshDto,
  ): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const data = await this.authService.refresh(dto.refreshToken);
    return { code: 200, message: 'ok', data };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('verify-2nd')
  async verifySecond(
    @Request() req: any,
    @Body() dto: VerifySecondDto,
  ): Promise<ApiResponse<{ secondToken: string }>> {
    const data = await this.authService.verifySecondPassword(
      req.user.id,
      dto.password,
    );
    return { code: 200, message: 'ok', data };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Request() req: any): Promise<ApiResponse<UserInfo>> {
    return { code: 200, message: 'ok', data: req.user };
  }
}
