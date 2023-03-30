import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '../node_modules/@nestjs/typeorm'
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { WsModule } from './ws/ws.module';
import { GameModule } from './game/game.module';
import { TempJwtModule } from './auth/temp_jwt/tempJwt.module';

@Module({
	imports: [
		UserModule,
		AuthModule,
		TempJwtModule,
		TypeOrmModule.forRoot(
			{
				"type": "postgres",
				"host": "localhost",
				"port": 5432,
				"username": "seojin",
				"password": "alsdl12",
				"database": "ft_transcendence",
				"synchronize": true,
				"logging": false,
				"entities": ["dist/**/*.entity.{ts,js}"],
			}
		),
		ChatModule,
		WsModule,
		GameModule,
	],
	controllers: [],
	providers: [],
})
export class AppModule {
}
