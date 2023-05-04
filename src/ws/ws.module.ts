import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { ChatModule } from 'src/chat/chat.module';
import { GameModule } from 'src/game/game.module';
import { WsGateWay } from './ws.gateway';
import { WsService } from './ws.service';
import { User } from 'src/user/entity/user.entity';
import { ChatRoom } from 'src/chat/entity/chat.room.entity';
import { UserModule } from 'src/user/user.module';
import { Dm } from 'src/dm/entity/dm.entity';
import { DmModule } from 'src/dm/dm.module';
import { GameRoomUser } from 'src/game/entity/game.room.user.entity';

@Module({
	imports: [
		GameModule,
		forwardRef(() => AuthModule),
		forwardRef(() => DmModule),
		forwardRef(() => UserModule),
		forwardRef(() => ChatModule),
		TypeOrmModule.forFeature([ User, ChatRoom, Dm ]),
	],
	
	providers: [ WsGateWay, WsService ],
	exports: [ WsGateWay, WsService ],

})
export class WsModule {}
