import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from 'src/auth/auth.module';
import { jwtConstants } from 'src/auth/constants';
import { SignupService } from './signup.service';
import { SignupStrategy } from './signup.strategy';

@Module({
	imports: [
		PassportModule,
		forwardRef(() => AuthModule),
		JwtModule.register({
			secret: jwtConstants.signupSecret,
			signOptions: { expiresIn: '120h'},
		})
	],
  providers: [ SignupService, SignupStrategy ],
	exports: [ SignupService ]
})
export class SignupModule {}
