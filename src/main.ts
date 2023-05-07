import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
const fs = require('fs');

async function bootstrap() {
  // const app = await NestFactory.create(AppModule);
	
	const httpsOptions = {
		key: fs.readFileSync(join(__dirname, '../src/secret/pong-rootca.pem' )),
		cert: fs.readFileSync(join(__dirname, '../src/secret/pong-cert.pem')),
	};

	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		// httpsOptions,
	});
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
