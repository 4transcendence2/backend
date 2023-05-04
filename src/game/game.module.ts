import { Module, forwardRef } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { Repository } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameRoom } from './entity/game.room.entity';
import { GameRoomUser } from './entity/game.room.user.entity';
import { WsModule } from 'src/ws/ws.module';
import { UserModule } from 'src/user/user.module';
import { GameHistory } from './entity/game.history.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([ GameRoom, GameRoomUser, GameHistory ]),
		forwardRef(() => WsModule),
		forwardRef(() => UserModule),
	],
	providers: [ GameService, Repository ],
	exports: [ GameService ],
	controllers: [ GameController ],
})
export class GameModule {}
