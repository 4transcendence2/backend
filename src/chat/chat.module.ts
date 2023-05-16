import { Module, forwardRef } from '@nestjs/common';
import { ChatService } from './chat.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entity/chat.room.entity';
import { User } from 'src/user/entity/user.entity';
import { AuthModule } from 'src/auth/auth.module';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { UserModule } from 'src/user/user.module';
import { WsModule } from 'src/ws/ws.module';
import { Dm } from 'src/dm/entity/dm.entity';
import { ChatRoomUser } from './entity/chat.room.user.entity';
import { ChatHistory } from './entity/chat.history.entity';
import { Block } from './entity/chat.block.entity';

@Module({
	imports: [
		forwardRef(() => AuthModule),
		forwardRef(() => UserModule),
		forwardRef(() => WsModule),
		TypeOrmModule.forFeature([ChatRoom, User, Dm, ChatRoomUser, ChatHistory, Block]),
	],
	providers: [ ChatService, JwtService, Repository ],
	controllers: [ ],
	exports: [ ChatService ],
})
export class ChatModule {}
