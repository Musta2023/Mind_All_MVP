import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  startupName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  stage: string; // idea, pre-seed, seed, series-a
}
