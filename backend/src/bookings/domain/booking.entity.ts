import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BookingStatus } from '@shared/enums';
import { Flight } from '../../flights/domain/flight.entity';
import { Seat } from '../../seats/domain/seat.entity';

// `cardLast4` is the only trace of the fictitious payment kept on record —
// the full card number and CVV never reach this entity (see
// ConfirmBookingRequestDto), even though the data is fake.
@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 6, unique: true })
  pnr: string;

  @Column()
  flightId: string;

  @ManyToOne(() => Flight, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flightId' })
  flight: Flight;

  @Column()
  seatId: string;

  @ManyToOne(() => Seat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seatId' })
  seat: Seat;

  @Column()
  seatNumber: string;

  @Column()
  passengerName: string;

  @Column({ length: 4 })
  cardLast4: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.CONFIRMED })
  status: BookingStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
