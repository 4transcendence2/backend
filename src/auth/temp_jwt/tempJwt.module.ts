import { Module, forwardRef } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UserModule } from "src/user/user.module";
import { jwtConstants } from "../constants";
import { JwtStrategy } from "../jwt.strategy";
import { TempJwtService } from "./tempJwt.service";
import { TempJwtStrategy } from "./tempJwt.strategy";

@Module({
	imports: [
		JwtModule.register({
			secret: jwtConstants.tempSecret,
			signOptions: { expiresIn: '60h' },
		}),
		PassportModule,
		forwardRef(() =>UserModule),
	],
	providers: [ TempJwtStrategy, TempJwtService ],
	exports: [ TempJwtService ],
})
export class TempJwtModule {}