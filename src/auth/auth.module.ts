import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { UserModule } from 'src/user/user.module';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { TwilioModule } from 'nestjs-twilio';
import { SignupModule } from 'src/signup/signup.module';
import { LoginModule } from '../login/login.module';
import { JwtStrategy } from './jwt.strategy';
import { Login2Strategy } from 'src/login/login.strategy';
import { SignupStrategy } from 'src/signup/signup.strategy';

@Module({
	imports: [
		forwardRef(() => UserModule),
		SignupModule,
		LoginModule,
		PassportModule,
		JwtModule.register({
			secret: jwtConstants.secret,
			signOptions: { expiresIn: '2d' },
		}),
		TwilioModule.forRoot({
			accountSid: "AC9409078cc01ffa3c66be5844f8bd145a",
			authToken: "53e28dea1e42e5fd0e5a143fbc8352f7"
		}),
	],
  providers: [ AuthService, LocalStrategy, JwtStrategy ],
  controllers: [ AuthController ],
	exports: [ AuthService ]
})
export class AuthModule {}
