import { Module } from '@nestjs/common';
import { DmService } from './dm.service';

@Module({
  providers: [DmService]
})
export class DmModule {}
