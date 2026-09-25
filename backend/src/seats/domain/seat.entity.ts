import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CabinClass, SeatStatus } from '@shared/enums';
import { Flight } from '../../flights/domain/flight.entity';

// `status` only ever persists AVAILABLE/OCCUPIED here — the temporary
// BLOCKED state lives entirely in Redis (see RedisSeatLockAdapter) so a
// lock expiring or a client disconnecting never requires a DB write.
@Entity('seats')
@Index(['flightId', 'seatNumber'], { unique: true })
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  flightId: string;

  @ManyToOne(() => Flight, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flightId' })
  flight: Flight;

  @Column({ type: 'int' })
  row: number;

  @Column()
  column: string;

  @Column()
  seatNumber: string;

  @Column({ type: 'enum', enum: CabinClass, default: CabinClass.ECONOMY })
  cabinClass: CabinClass;

  @Column({ type: 'enum', enum: SeatStatus, default: SeatStatus.AVAILABLE })
  status: SeatStatus;
}
