import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class KillReportDto {
  @IsString()
  processName: string;

  @IsNumber()
  pid: number;

  @IsBoolean()
  success: boolean;

  @IsString()
  @IsOptional()
  resultText?: string;

  @IsString()
  triggeredBy: string;
}
