import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { UserModule } from 'src/user/user.module';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { TwilioModule } from 'nestjs-twilio';
import { JwtStrategy } from './jwt.strategy';
import { TempJwtModule } from './temp_jwt/tempJwt.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entity/user.entity';
require('dotenv').config();

@Module({
	imports: [
		forwardRef(() => UserModule),
		PassportModule,
		TempJwtModule,
		JwtModule.register({
			secret: process.env.SECRET,
			signOptions: { expiresIn: '2d' },
		}),
		TwilioModule.forRoot({
			accountSid: process.env.TWILIO_ACCOUNT_SID,
			// accountSid: "AC9409078cc01ffa3c66be5844f8bd145a",
			authToken: process.env.TWILIO_AUTH_TOKEN,
			// authToken: "a80723527d59605c634c6901077190db",
		}),
		TypeOrmModule.forFeature([User])
	],
  providers: [ AuthService, LocalStrategy, JwtStrategy ],
  controllers: [ AuthController ],
	exports: [ AuthService ]
})
export class AuthModule {}
