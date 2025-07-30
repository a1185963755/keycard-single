import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateBatchDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  count: number;
}
