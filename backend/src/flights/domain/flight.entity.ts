import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { FlightStatus } from '@shared/enums';

@Entity('flights')
export class Flight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  flightNumber: string;

  @Column()
  airline: string;

  @Column()
  origin: string;

  @Column()
  destination: string;

  @Column({ type: 'timestamptz' })
  departureAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: string;

  @Column({ type: 'enum', enum: FlightStatus, default: FlightStatus.SCHEDULED })
  status: FlightStatus;
}
