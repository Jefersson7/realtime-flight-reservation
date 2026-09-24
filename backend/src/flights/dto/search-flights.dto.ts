import { IsDateString, IsOptional, IsString, Length } from 'class-validator';
import { FlightSearchQuery } from '@shared/dto';

export class SearchFlightsDto implements FlightSearchQuery {
  @IsOptional()
  @IsString()
  @Length(3, 3)
  origin?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  destination?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
