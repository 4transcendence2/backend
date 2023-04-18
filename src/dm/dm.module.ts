import { Module, forwardRef } from '@nestjs/common';
import { DmService } from './dm.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dm } from './entity/dm.entity';
import { DmHistory } from './entity/dm.history';
import { WsModule } from 'src/ws/ws.module';
import { UserModule } from 'src/user/user.module';

@Module({
	imports: [
		forwardRef(() => WsModule),
		forwardRef(() => UserModule),
		TypeOrmModule.forFeature([ Dm, DmHistory ])
	],
  providers: [DmService],
	exports: [DmService]
})
export class DmModule {}
