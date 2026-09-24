import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis-client.provider';
import { SeatLockOwner, SeatLockPort } from '../ports/seat-lock.port';

// Compare-and-delete so a client can only release a lock it currently owns
// (GET+DEL from application code would race between the two calls).
const RELEASE_IF_OWNER_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

@Injectable()
export class RedisSeatLockAdapter implements SeatLockPort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private key(seatId: string): string {
    return `seat:block:${seatId}`;
  }

  async tryAcquire(seatId: string, ownerId: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(this.key(seatId), ownerId, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async release(seatId: string, ownerId: string): Promise<boolean> {
    const result = await this.redis.eval(RELEASE_IF_OWNER_SCRIPT, 1, this.key(seatId), ownerId);
    return result === 1;
  }

  async getOwners(seatIds: string[]): Promise<Map<string, SeatLockOwner>> {
    const owners = new Map<string, SeatLockOwner>();
    if (seatIds.length === 0) return owners;

    const pipeline = this.redis.pipeline();
    seatIds.forEach((seatId) => {
      pipeline.get(this.key(seatId));
      pipeline.pttl(this.key(seatId));
    });
    const results = await pipeline.exec();
    if (!results) return owners;

    seatIds.forEach((seatId, index) => {
      const ownerId = results[index * 2]?.[1] as string | null;
      const ttlMs = results[index * 2 + 1]?.[1] as number;
      if (ownerId && ttlMs > 0) {
        owners.set(seatId, {
          ownerId,
          expiresAt: new Date(Date.now() + ttlMs).toISOString(),
        });
      }
    });

    return owners;
  }
}
