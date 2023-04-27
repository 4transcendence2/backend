import { Module, forwardRef } from '@nestjs/common';
import { DmService } from './dm.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dm } from './entity/dm.entity';
import { DmHistory } from './entity/dm.history';
import { WsModule } from 'src/ws/ws.module';
import { UserModule } from 'src/user/user.module';
import { DmController } from './dm.controller';
import { AuthModule } from 'src/auth/auth.module';
import { DmUser } from './entity/dm.user.entity';

@Module({
	imports: [
		forwardRef(() => WsModule),
		forwardRef(() => UserModule),
		forwardRef(() => AuthModule),
		TypeOrmModule.forFeature([ Dm, DmHistory, DmUser ])
	],
  providers: [DmService],
	exports: [DmService],
	controllers: [DmController]
})
export class DmModule {}
