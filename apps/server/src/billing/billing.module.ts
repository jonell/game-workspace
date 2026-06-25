import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret',
      signOptions: { expiresIn: '15m' },
    }),
    MulterModule.register({
      dest: './uploads/screenshots',
    }),
  ],
  controllers: [BillingController, UploadController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
