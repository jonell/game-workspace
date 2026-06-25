import {
  IsEnum,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';
import { OrderType, DispatchType } from '@chunlv/shared';

export class CreateOrderDto {
  @IsEnum(OrderType)
  type: OrderType;

  @IsString()
  studioId: string;

  @IsString()
  customerId: string;

  @IsEnum(DispatchType)
  dispatchType: DispatchType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  gameName: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  customFields?: Record<string, unknown>;

  @IsBoolean()
  isOnline: boolean;

  @IsOptional()
  @IsString()
  companionId?: string;
}
