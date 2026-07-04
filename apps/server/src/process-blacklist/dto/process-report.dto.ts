import { IsArray, IsNumber, IsString, IsOptional } from 'class-validator';

export class ProcessInfoDto {
  @IsString()
  name: string;

  @IsNumber()
  pid: number;

  @IsString()
  @IsOptional()
  path?: string;

  @IsNumber()
  memoryMB: number;
}

export class ProcessReportDto {
  @IsArray()
  processes: ProcessInfoDto[];

  @IsNumber()
  totalCount: number;
}
