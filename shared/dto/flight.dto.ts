import { FlightStatus } from '../enums';

export interface FlightSearchQuery {
  origin?: string;
  destination?: string;
  date?: string;
}

export interface FlightDto {
  id: string;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departureAt: string;
  price: number;
  status: FlightStatus;
}
