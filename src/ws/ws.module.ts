import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { ChatModule } from 'src/chat/chat.module';
import { GameModule } from 'src/game/game.module';
import { SignupModule } from 'src/signup/signup.module';
import { WsGateWay } from './ws.gateway';
import { WsService } from './ws.service';
import { User } from 'src/user/entity/user.entity';
import { Repository } from 'typeorm';
import { ChatRoom } from 'src/chat/entity/chat-room.entity';
import { UserModule } from 'src/user/user.module';

@Module({
	imports: [
		SignupModule,
		AuthModule,
		GameModule,
		UserModule,
		forwardRef(() => ChatModule),
		TypeOrmModule.forFeature([ User, ChatRoom ]),
	],
	
	providers: [ WsGateWay, WsService, Repository ],
	exports: [ WsGateWay, WsService ],

})
export class WsModule {}
