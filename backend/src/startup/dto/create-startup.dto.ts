import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

export class CreateStartupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsString()
  description: string;

  @IsObject()
  currentMetrics: Record<string, any>;

  @IsString()
  target: string;

  @IsString()
  competitiveEdge: string;

  @IsOptional()
  @IsNumber()
  fundingRaised?: number;

  @IsOptional()
  @IsNumber()
  runway?: number;

  @IsOptional()
  team?: Record<string, any>[];
}

export class UpdateStartupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  currentMetrics?: Record<string, any>;

  @IsOptional()
  @IsString()
  target?: string;

  @IsOptional()
  @IsString()
  competitiveEdge?: string;

  @IsOptional()
  @IsNumber()
  fundingRaised?: number;

  @IsOptional()
  @IsNumber()
  runway?: number;

  @IsOptional()
  team?: Record<string, any>[];
}
