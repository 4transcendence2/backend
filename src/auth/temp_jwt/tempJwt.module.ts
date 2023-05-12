import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UserModule } from "src/user/user.module";
import { TempJwtService } from "./tempJwt.service";
import { TempJwtStrategy } from "./tempJwt.strategy";
require('dotenv').config();

@Module({
	imports: [
		JwtModule.register({
			secret: process.env.TMP_SECRET,
			signOptions: { expiresIn: '3d' },
		}),
		PassportModule,
		forwardRef(() => UserModule ),
	],
	providers: [ TempJwtStrategy, TempJwtService ],
	exports: [ TempJwtService ],
})
export class TempJwtModule {}