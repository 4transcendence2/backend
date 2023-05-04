import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
const fs = require('fs');

async function bootstrap() {
  // const app = await NestFactory.create(AppModule);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

	// const httpsOptions = {
	// 	key: fs.readFileSync('./secret/pong-rootca.pem'),
	// 	cert: fs.readFileSync('./secret/pong-cert.pem')
	// };
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
		})
	);
	app.enableCors();
  await app.listen(81);
}
bootstrap();
