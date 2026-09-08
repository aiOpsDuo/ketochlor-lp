import { Module } from '@nestjs/common';
import { AdminPingController } from './admin-ping.controller';

/** Ver comentário de descartabilidade em `admin-ping.controller.ts`. */
@Module({
  controllers: [AdminPingController],
})
export class AdminPingModule {}
