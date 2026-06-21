import { Controller, Get, Post, Put, Body, Query, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { StudiosService } from './studios.service';
import { UserRole } from '@chunlv/shared';
import type { ApiResponse } from '@chunlv/shared';

@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class StudiosController {
  constructor(private readonly studiosService: StudiosService) {}

  @Get('studios')
  @Roles(UserRole.OWNER)
  async findAll(): Promise<ApiResponse<unknown>> {
    const data = await this.studiosService.findAll();
    return { code: 200, message: 'ok', data };
  }

  @Post('studios')
  @Roles(UserRole.OWNER)
  async create(@Body('name') name: string): Promise<ApiResponse<unknown>> {
    const data = await this.studiosService.create(name);
    return { code: 200, message: 'ok', data };
  }

  @Put('studios/:id')
  @Roles(UserRole.OWNER)
  async update(
    @Param('id') id: string,
    @Body('name') name: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.studiosService.update(id, name);
    return { code: 200, message: 'ok', data };
  }

  @Get('employees')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getEmployees(@Query('studioId') studioId: string): Promise<ApiResponse<unknown>> {
    const data = await this.studiosService.getEmployees(studioId);
    return { code: 200, message: 'ok', data };
  }

  @Post('employees')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async createEmployee(
    @Body() dto: { username: string; password: string; role: string; studioId: string },
  ): Promise<ApiResponse<unknown>> {
    const data = await this.studiosService.createEmployee(dto.studioId, dto);
    return { code: 200, message: 'ok', data };
  }

  @Put('employees/:id/password')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async resetPassword(
    @Param('id') id: string,
    @Body('password') password: string,
  ): Promise<ApiResponse<unknown>> {
    await this.studiosService.resetPassword(id, password);
    return { code: 200, message: 'ok', data: null };
  }
}
