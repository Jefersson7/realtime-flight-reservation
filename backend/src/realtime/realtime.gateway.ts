import { forwardRef, Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  FLIGHT_EVENTS,
  FlightStatusChangedPayload,
  JoinFlightPayload,
  SEAT_EVENTS,
  SeatBlockedPayload,
  SeatBlockRequest,
  SeatOccupiedPayload,
  SeatReleasedPayload,
  SeatReleaseRequest,
} from '@shared/events';
import { RealtimeNotifierPort } from './ports/realtime-notifier.port';
import { flightRoom } from './utils/flight-room';
import { BlockSeatUseCase, SEAT_LOCK_TTL_SECONDS } from '../seats/application/block-seat.use-case';
import { ReleaseSeatUseCase } from '../seats/application/release-seat.use-case';

// Broadcasts flight-status updates globally (no room) but scopes seat
// events to `flight:{id}` rooms, since only clients viewing that flight's
// seat map need them. Also owns the inbound `seat:block`/`seat:release`
// listeners: a documented exception to the unidirectional dependency rule
// toward `realtime` (see ADR-003) — the gateway acts as a WS "controller"
// for seats/application, same as any HTTP controller would.
@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL } })
export class RealtimeGateway implements RealtimeNotifierPort {
  @WebSocketServer()
  server: Server;

  // One pending timer per blocked seat. Fires at the Redis lock's TTL to
  // broadcast `SEAT_RELEASED` so every client frees the seat the moment the
  // reservation expires — neither the owner nor the other viewers are left
  // with a stale "blocked" state.
  private readonly autoReleaseTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    @Inject(forwardRef(() => BlockSeatUseCase))
    private readonly blockSeatUseCase: BlockSeatUseCase,
    @Inject(forwardRef(() => ReleaseSeatUseCase))
    private readonly releaseSeatUseCase: ReleaseSeatUseCase,
  ) {}

  notifyFlightStatusChanged(payload: FlightStatusChangedPayload): void {
    this.server.emit(FLIGHT_EVENTS.STATUS_CHANGED, payload);
  }

  notifySeatBlocked(payload: SeatBlockedPayload): void {
    this.server.to(flightRoom(payload.flightId)).emit(SEAT_EVENTS.BLOCKED, payload);
  }

  notifySeatReleased(payload: SeatReleasedPayload): void {
    this.server.to(flightRoom(payload.flightId)).emit(SEAT_EVENTS.RELEASED, payload);
  }

  // The seat is now permanently OCCUPIED (booking confirmed): cancel any
  // pending auto-release timer so it doesn't fire later and try to free a
  // seat that no longer has a temporary lock at all.
  notifySeatOccupied(payload: SeatOccupiedPayload): void {
    this.cancelAutoRelease(payload.seatId);
    this.server.to(flightRoom(payload.flightId)).emit(SEAT_EVENTS.OCCUPIED, payload);
  }

  @SubscribeMessage(SEAT_EVENTS.JOIN_FLIGHT)
  handleJoinFlight(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinFlightPayload) {
    client.join(flightRoom(payload.flightId));
  }

  @SubscribeMessage(SEAT_EVENTS.LEAVE_FLIGHT)
  handleLeaveFlight(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinFlightPayload) {
    client.leave(flightRoom(payload.flightId));
  }

  // The lock is owned by the stable `payload.clientId` (per-tab token, see
  // shared/events/seat.events.ts), never by `client.id`: the socket id
  // changes on every reconnect, but the reservation must survive it.
  @SubscribeMessage(SEAT_EVENTS.BLOCK)
  async handleSeatBlock(@ConnectedSocket() _client: Socket, @MessageBody() payload: SeatBlockRequest) {
    try {
      const result = await this.blockSeatUseCase.execute(
        payload.flightId,
        payload.seatId,
        payload.clientId,
      );
      this.scheduleAutoRelease(payload.flightId, payload.seatId, payload.clientId);
      return { ok: true as const, ...result };
    } catch (error) {
      return {
        ok: false as const,
        seatId: payload.seatId,
        message: error instanceof Error ? error.message : 'No se pudo bloquear el asiento',
      };
    }
  }

  @SubscribeMessage(SEAT_EVENTS.RELEASE)
  async handleSeatRelease(@ConnectedSocket() _client: Socket, @MessageBody() payload: SeatReleaseRequest) {
    try {
      const released = await this.releaseSeatUseCase.execute(
        payload.flightId,
        payload.seatId,
        payload.clientId,
      );
      if (released) this.cancelAutoRelease(payload.seatId);
      // `released` is false only when the caller no longer owns the lock
      // (already expired or another client owns it) — nothing to broadcast.
      return { ok: released };
    } catch (error) {
      // Never let a Redis failure leave the caller hanging: the socket ack
      // must always arrive, otherwise the client's pending state deadlocks.
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'No se pudo liberar el asiento',
      };
    }
  }

  // When the Redis TTL elapses there is no write to a DB that could wake a
  // listener: the release must be driven from here. The timer mirrors the
  // exact TTL set in `block-seat.use-case` (SEAT_LOCK_TTL_SECONDS), so it
  // fires within the same instant the lock would expire.
  private scheduleAutoRelease(flightId: string, seatId: string, clientId: string): void {
    this.cancelAutoRelease(seatId);
    const timer = setTimeout(() => void this.autoReleaseSeat(flightId, seatId, clientId), SEAT_LOCK_TTL_SECONDS * 1000);
    this.autoReleaseTimers.set(seatId, timer);
  }

  private cancelAutoRelease(seatId: string): void {
    const timer = this.autoReleaseTimers.get(seatId);
    if (timer) {
      clearTimeout(timer);
      this.autoReleaseTimers.delete(seatId);
    }
  }

  private async autoReleaseSeat(flightId: string, seatId: string, clientId: string): Promise<void> {
    this.autoReleaseTimers.delete(seatId);
    const released = await this.releaseSeatUseCase.execute(flightId, seatId, clientId);
    // If the Redis TTL beat our timer (clock drift), `release` returns false
    // and skips the broadcast — but the reservation window is over either
    // way, so we still notify so all clients free the seat.
    if (!released) {
      this.notifySeatReleased({ flightId, seatId });
    }
  }
}