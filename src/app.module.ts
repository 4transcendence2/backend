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
				"host": process.env.POSTGRES_HOST,
				"port": parseInt(process.env.POSTGRES_PORT),
				"username": process.env.POSTGRES_USERNAME,
				"password": process.env.POSTGRES_PASSWORD,
				"database": process.env.POSTGRES_DB,
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
