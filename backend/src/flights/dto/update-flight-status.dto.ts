import { IsEnum } from 'class-validator';
import { FlightStatus } from '@shared/enums';

export class UpdateFlightStatusDto {
  @IsEnum(FlightStatus)
  status: FlightStatus;
}
