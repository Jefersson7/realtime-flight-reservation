import { BookingStatus } from '../enums';

export interface BookingDto {
  id: string;
  pnr: string;
  flightId: string;
  seatId: string;
  seatNumber: string;
  passengerName: string;
  amount: number;
  status: BookingStatus;
  createdAt: string;
}

// Payload sent by the payment form. Card data is fictitious (no real
// payment processor involved) — the backend only keeps the last 4 digits of
// `cardNumber`, never the full number or `cvv`.
export interface ConfirmBookingRequest {
  flightId: string;
  seatId: string;
  clientId: string;
  cardHolderName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
}
