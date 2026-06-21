import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Req,
  Headers,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { BillingService } from './billing.service';
import { UserRole } from '@chunlv/shared';
import type { ApiResponse } from '@chunlv/shared';

@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly jwtService: JwtService,
  ) {}

  // ── Transactions ──

  @Post('api/transactions')
  @Roles(UserRole.COMPANION)
  async createTransaction(
    @Body() dto: any,
    @Req() req: any,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.billingService.createTransaction({
      ...dto,
      companionId: req.user.companionId,
    });
    return { code: 201, message: '报账提交成功', data };
  }

  @Get('api/transactions')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.COMPANION)
  async findAll(
    @Req() req: any,
    @Query('status') status?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.billingService.findAll(req.user, status);
    return { code: 200, message: 'ok', data };
  }

  @Put('api/transactions/:id/approve')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async approve(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.billingService.approve(id, req.user.id);
    return { code: 200, message: '审核通过', data };
  }

  @Put('api/transactions/:id/reject')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async reject(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.billingService.reject(id, req.user.id);
    return { code: 200, message: '已拒绝', data };
  }

  // ── Revenue ──

  @Get('api/revenue/daily')
  async getDailyRevenue(
    @Req() req: any,
    @Query('date') date?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.billingService.getDailyRevenue(
      req.user.studioId,
      date,
    );
    return { code: 200, message: 'ok', data };
  }

  @Get('api/revenue/monthly')
  async getMonthlyRevenue(
    @Req() req: any,
    @Query('month') month?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.billingService.getMonthlyRevenue(
      req.user.studioId,
      month,
    );
    return { code: 200, message: 'ok', data };
  }

  @Get('api/revenue/stats')
  @Roles(UserRole.OWNER)
  getProfitLoss(
    @Req() req: any,
    @Headers('x-second-token') secondToken: string,
  ): Promise<ApiResponse<unknown>> {
    try {
      this.jwtService.verify(secondToken);
    } catch {
      throw new UnauthorizedException('二级密码验证已过期');
    }
    return this.billingService
      .getProfitLoss(req.user.studioId)
      .then((data) => ({ code: 200, message: 'ok', data }));
  }

  // ── Expenses ──

  @Post('api/expenses')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async createExpense(
    @Req() req: any,
    @Body() dto: any,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.billingService.createExpense(
      req.user.studioId,
      dto,
    );
    return { code: 201, message: '支出记录已创建', data };
  }

  @Get('api/expenses')
  async getExpenses(@Req() req: any): Promise<ApiResponse<unknown>> {
    const data = await this.billingService.getExpenses(req.user.studioId);
    return { code: 200, message: 'ok', data };
  }
}
