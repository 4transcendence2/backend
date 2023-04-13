import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { Repository } from 'typeorm';

@Module({
	imports: [
	],
	providers: [ GameService, Repository ],
	exports: [ GameService ],
	controllers: [ GameController ],
})
export class GameModule {}
