import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { User } from './entity/user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { GameModule } from 'src/game/game.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([User]),
		forwardRef(() => AuthModule),
		GameModule,
],
	controllers: [ UserController ],
	providers: [ UserService ],
	exports: [ UserService ],
})
export class UserModule {

}
