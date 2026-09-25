import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';

// Fictitious payment data — only format is validated (no Luhn check, no
// expiry-date-in-the-future check, no real gateway). The full card number
// and CVV are validated here but never persisted (see Booking entity).
export class ConfirmBookingRequestDto {
  @IsUUID()
  flightId: string;

  @IsUUID()
  seatId: string;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  cardHolderName: string;

  @Matches(/^\d{16}$/, { message: 'cardNumber debe tener 16 dígitos' })
  cardNumber: string;

  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'expiryDate debe tener el formato MM/YY' })
  expiryDate: string;

  @Matches(/^\d{3,4}$/, { message: 'cvv debe tener 3 o 4 dígitos' })
  cvv: string;
}
