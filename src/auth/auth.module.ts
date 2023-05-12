import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { TwilioModule } from 'nestjs-twilio';
import { JwtStrategy } from './jwt.strategy';
import { TempJwtModule } from './temp_jwt/tempJwt.module';
import { SignupJwtModule } from './signup_jwt/signupJwt.module';
import { WsModule } from 'src/ws/ws.module';
require('dotenv').config();

@Module({
	imports: [
		forwardRef(() => UserModule),
		forwardRef(() => WsModule),
		PassportModule,
		TempJwtModule,
		SignupJwtModule,
		JwtModule.register({
			secret: process.env.SECRET,
			signOptions: { expiresIn: '3d' },
		}),
		TwilioModule.forRoot({
			accountSid: process.env.TWILIO_ACCOUNT_SID,
			authToken: process.env.TWILIO_AUTH_TOKEN,
		}),
	],
  providers: [ AuthService, JwtStrategy ],
  controllers: [ AuthController ],
	exports: [ AuthService ]
})
export class AuthModule {}
