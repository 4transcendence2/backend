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
import Dm from 'src/chat/entity/chat.dm.entity';

@Module({
	imports: [
		AuthModule,
		GameModule,
		forwardRef(() => UserModule),
		forwardRef(() => ChatModule),
		TypeOrmModule.forFeature([ User, ChatRoom, Dm ]),
	],
	
	providers: [ WsGateWay, WsService ],
	exports: [ WsGateWay, WsService ],

})
export class WsModule {}
