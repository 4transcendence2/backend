import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '../node_modules/@nestjs/typeorm'
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { WsModule } from './ws/ws.module';
import { GameModule } from './game/game.module';
import { TempJwtModule } from './auth/temp_jwt/tempJwt.module';
import { SignupJwtModule } from './auth/signup_jwt/signupJwt.module';
import { join } from 'path'
import { ServeStaticModule } from '@nestjs/serve-static';
import { MulterModule } from '@nestjs/platform-express';
require('dotenv').config();



@Module({
	imports: [
		UserModule,
		AuthModule,
		TempJwtModule,
		SignupJwtModule,
		TypeOrmModule.forRoot(
			{
				"type": "postgres",
				"host": process.env.POSTGRES_HOST,
				"port": parseInt(process.env.POSTGRES_PORT),
				"username": process.env.POSTGRES_USERNAME,
				"password": process.env.POSTGRES_PASSWORD,
				"database": process.env.POSTGRES_DB,
				"synchronize": true,
				"autoLoadEntities": true, // This line tells TypeORM to automatically load entities from the configured paths
				"logging": false,
				"entities": ["dist/**/*.entity.{ts,js}"],
			}
		),
		ChatModule,
		WsModule,
		GameModule,
		MulterModule.register({
			dest: join(__dirname, '..', 'public', 'avatar')
		})
	],
	controllers: [],
	providers: [],
})
export class AppModule {
}
