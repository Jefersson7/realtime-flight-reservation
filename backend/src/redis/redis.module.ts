import { Module } from '@nestjs/common';
import { redisClientProvider, REDIS_CLIENT } from './redis-client.provider';

@Module({
  providers: [redisClientProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
