import { IsString, IsOptional } from 'class-validator';

export class CreateWhitelistDto {
  @IsString()
  processName: string;

  @IsString()
  @IsOptional()
  processPath?: string;
}
