import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { REALTIME_NOTIFIER } from './ports/realtime-notifier.port';

@Module({
  providers: [
    RealtimeGateway,
    { provide: REALTIME_NOTIFIER, useExisting: RealtimeGateway },
  ],
  exports: [REALTIME_NOTIFIER],
})
export class RealtimeModule {}
