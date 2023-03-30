import { Module, forwardRef } from '@nestjs/common';
import { SignupModule } from 'src/signup/signup.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entity/chat-room.entity';
import { User } from 'src/user/entity/user.entity';
import { AuthModule } from 'src/auth/auth.module';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { UserModule } from 'src/user/user.module';
import { WsModule } from 'src/ws/ws.module';

@Module({
	imports: [ 
		SignupModule,
		UserModule,
		AuthModule,
		forwardRef(() => WsModule),
		TypeOrmModule.forFeature([ChatRoom, User]),
	],
	providers: [ ChatService, JwtService, Repository ],
	controllers: [ ChatController ],
	exports: [ ChatService ],
})
export class ChatModule {}
