import { Module } from '@nestjs/common';
import { ProcessBlacklistController } from './process-blacklist.controller';
import { ProcessBlacklistService } from './process-blacklist.service';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [WsModule],
  controllers: [ProcessBlacklistController],
  providers: [ProcessBlacklistService],
  exports: [ProcessBlacklistService],
})
export class ProcessBlacklistModule {}
