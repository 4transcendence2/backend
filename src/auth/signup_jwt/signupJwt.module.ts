import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UserModule } from "src/user/user.module";
import { SignupJwtStrategy } from "./sighupJwt.strategy";
import { SignupJwtService } from "./signupJwt.service";

@Module({
	imports: [
		JwtModule.register({
			secret: process.env.TMP_SECRET,
			signOptions: { expiresIn: '60h' },
		}),
		PassportModule,
		forwardRef(() => UserModule )
	],
	providers: [ SignupJwtStrategy, SignupJwtService ],
	exports: [ SignupJwtService ]

})
export class SignupJwtModule {}