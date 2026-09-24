import { forwardRef, Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { REALTIME_NOTIFIER } from './ports/realtime-notifier.port';
import { SeatsModule } from '../seats/seats.module';

@Module({
  imports: [forwardRef(() => SeatsModule)],
  providers: [
    RealtimeGateway,
    { provide: REALTIME_NOTIFIER, useExisting: RealtimeGateway },
  ],
  exports: [REALTIME_NOTIFIER],
})
export class RealtimeModule {}
