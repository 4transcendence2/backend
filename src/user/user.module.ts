import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { User } from './entity/user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { GameModule } from 'src/game/game.module';
import { WsModule } from 'src/ws/ws.module';
import { UserFriend } from './entity/user.friend';

@Module({
	imports: [
		TypeOrmModule.forFeature([User, UserFriend]),
		forwardRef(() => AuthModule),
		forwardRef(() => WsModule),
		forwardRef(() => GameModule),
],
	controllers: [ UserController ],
	providers: [ UserService ],
	exports: [ UserService ],
})
export class UserModule {

}
