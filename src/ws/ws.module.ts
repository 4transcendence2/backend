import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { ChatModule } from 'src/chat/chat.module';
import { GameModule } from 'src/game/game.module';
import { WsGateWay } from './ws.gateway';
import { WsService } from './ws.service';
import { UserModule } from 'src/user/user.module';
import { DmModule } from 'src/dm/dm.module';

@Module({
	imports: [
		GameModule,
		forwardRef(() => AuthModule),
		forwardRef(() => DmModule),
		forwardRef(() => UserModule),
		forwardRef(() => ChatModule),
	],
	
	providers: [ WsGateWay, WsService ],
	exports: [ WsGateWay, WsService ],

})
export class WsModule {}
