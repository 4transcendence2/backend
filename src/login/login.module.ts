import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from 'src/auth/auth.module';
import { jwtConstants } from 'src/auth/constants';
import { LoginService } from './login.service';
import { Login2Strategy } from './login.strategy';

@Module({
	imports: [
		PassportModule,
		forwardRef(() => AuthModule),
		JwtModule.register({
			secret: jwtConstants.loginSecret,
			signOptions: { expiresIn: '120h' },
		})
	],
	providers: [ LoginService, Login2Strategy ],
	exports: [ LoginService ]
})
export class LoginModule {}
