import { Module } from '@nestjs/common';
import { CompanionsService } from './companions.service';
import { CompanionsController } from './companions.controller';

@Module({
  controllers: [CompanionsController],
  providers: [CompanionsService],
  exports: [CompanionsService],
})
export class CompanionsModule {}
