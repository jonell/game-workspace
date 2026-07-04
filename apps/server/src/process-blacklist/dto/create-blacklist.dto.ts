import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateBlacklistDto {
  @IsString()
  processName: string;

  @IsString()
  @IsOptional()
  processPath?: string;
}

export class UpdateBlacklistDto {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  processPath?: string;
}
