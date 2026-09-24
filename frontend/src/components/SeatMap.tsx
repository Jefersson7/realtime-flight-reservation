import { Fragment } from 'react';
import { SeatDto } from '@shared/dto';
import { CabinClass, SeatStatus } from '@shared/enums';
import './SeatMap.css';

interface SeatMapProps {
  seats: SeatDto[];
  myClientId: string | null;
  disabled?: boolean;
  onSeatClick: (seat: SeatDto) => void;
}

function seatModifier(seat: SeatDto, myClientId: string | null): string {
  if (seat.status === SeatStatus.OCCUPIED) return 'seat--occupied';
  if (seat.status === SeatStatus.BLOCKED) {
    return seat.blockedBy && seat.blockedBy === myClientId ? 'seat--mine' : 'seat--blocked';
  }
  return 'seat--available';
}

function seatTitle(seat: SeatDto, myClientId: string | null): string {
  if (seat.status === SeatStatus.OCCUPIED) return `${seat.seatNumber} · Ocupado`;
  if (seat.status === SeatStatus.BLOCKED) {
    return seat.blockedBy === myClientId
      ? `${seat.seatNumber} · Bloqueado por ti`
      : `${seat.seatNumber} · Bloqueado temporalmente por otro pasajero`;
  }
  return `${seat.seatNumber} · Disponible`;
}

function groupByRow(seats: SeatDto[]): [number, SeatDto[]][] {
  const rows = new Map<number, SeatDto[]>();
  seats.forEach((seat) => {
    const list = rows.get(seat.row) ?? [];
    list.push(seat);
    rows.set(seat.row, list);
  });
  return Array.from(rows.entries()).sort(([a], [b]) => a - b);
}

export function SeatMap({ seats, myClientId, disabled, onSeatClick }: SeatMapProps) {
  const rows = groupByRow(seats);
  let previousCabinClass: CabinClass | null = null;

  return (
    <div className="seat-map">
      <div className="seat-map-fuselage">
        <div className="seat-map-nose">✈</div>

        {rows.map(([row, rowSeats]) => {
          const cabinClass = rowSeats[0]?.cabinClass;
          const showCabinDivider = cabinClass && cabinClass !== previousCabinClass;
          previousCabinClass = cabinClass ?? previousCabinClass;

          return (
            <div key={row}>
              {showCabinDivider && (
                <div className="seat-map-cabin-divider">
                  {cabinClass === CabinClass.BUSINESS ? 'Business' : 'Económica'}
                </div>
              )}
              <div className="seat-map-row">
                <span className="seat-map-row-label">{row}</span>
                <div className="seat-map-seats">
                  {rowSeats.map((seat, index) => (
                    <Fragment key={seat.id}>
                      {index === 3 && <div className="seat-map-aisle" />}
                      <button
                        type="button"
                        className={`seat ${seatModifier(seat, myClientId)}`}
                        title={seatTitle(seat, myClientId)}
                        disabled={
                          disabled ||
                          seat.status === SeatStatus.OCCUPIED ||
                          (seat.status === SeatStatus.BLOCKED && seat.blockedBy !== myClientId)
                        }
                        onClick={() => onSeatClick(seat)}
                      >
                        {seat.column}
                      </button>
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="seat-map-legend">
        <span className="seat-map-legend-item">
          <span className="seat seat--available seat--legend" /> Disponible
        </span>
        <span className="seat-map-legend-item">
          <span className="seat seat--mine seat--legend" /> Tu selección
        </span>
        <span className="seat-map-legend-item">
          <span className="seat seat--blocked seat--legend" /> Bloqueado
        </span>
        <span className="seat-map-legend-item">
          <span className="seat seat--occupied seat--legend" /> Ocupado
        </span>
      </div>
    </div>
  );
}
