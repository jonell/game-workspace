import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  orderId: string;

  @IsString()
  companionId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  paymentMethod: string;

  @IsString()
  screenshotUrl: string;

  @IsString()
  paidAt: string;

  @IsOptional()
  @IsString()
  note?: string;
}
