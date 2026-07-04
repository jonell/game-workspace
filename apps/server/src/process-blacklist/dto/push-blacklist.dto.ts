import { IsArray, IsOptional, IsBoolean, IsString } from 'class-validator';

export class PushBlacklistDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  companionIds?: string[];

  @IsBoolean()
  @IsOptional()
  targetAll?: boolean;
}
