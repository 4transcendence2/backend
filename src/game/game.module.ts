import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameHistory } from './entity/game.history.entiry';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { Repository } from 'typeorm';

@Module({
	imports: [
		TypeOrmModule.forFeature([ GameHistory ]),
	],
	providers: [ GameService, Repository ],
	exports: [ GameService ],
	controllers: [ GameController ],
})
export class GameModule {}
