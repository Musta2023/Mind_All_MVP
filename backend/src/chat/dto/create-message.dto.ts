import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;
}
