import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}

export class VerifySecondDto {
  @IsString()
  password: string;
}
