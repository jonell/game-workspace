import { IsString, IsOptional } from 'class-validator';

export class CreateCompanionOverrideDto {
  @IsString()
  processName: string;

  @IsString()
  @IsOptional()
  processPath?: string;
}
