import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Socket, Server } from 'socket.io';
import { Repository } from 'typeorm';
import { GameRoom } from './entity/game.room.entity';
import { GameRoomUser } from './entity/game.room.user.entity';
import { WsService } from 'src/ws/ws.service';
import { Rule } from './game.rule';
import { UserService } from 'src/user/user.service';
import { Role } from './game.role';
import { WsGateWay } from 'src/ws/ws.gateway';
import { User } from 'src/user/entity/user.entity';
import { GameHistory } from './entity/game.history.entity';


interface queue {
	client: Socket,
	name: string,
	id: string,
};

interface status {
	playing: boolean,
	roomId: number,
	ballX: number,
	ballY: number,
	ballRadius: number,
	dx: number,
	dy: number,
	redUser: string,
	redPaddleX: number,
	redPaddleY: number,
	redPaddleWidth: number,
	redPaddleHeight: number,
	redScore: number,
	blueUser: string,
	bluePaddleX: number,
	bluePaddleY: number,
	bluePaddleWidth: number,
	bluePaddleHeight: number,
	blueScore: number,
	spectator: string[],
};


@Injectable()
export class GameService {

	public rank: queue[] = [];
	public normal: queue[] = [];
	public arcade: queue[] = [];
	private rooms: status[] = [];
	constructor(

		@InjectRepository(GameRoom)
		private gameRoomRepository: Repository<GameRoom>,

		@InjectRepository(GameRoomUser)
		private gameRoomUserRepository: Repository<GameRoomUser>,

		@InjectRepository(GameHistory)
		private gameHistoryRepository: Repository<GameHistory>,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

		@Inject(forwardRef(() => WsGateWay))
		private wsGateway: WsGateWay,
		
	) {}

	async findOne(id: number): Promise<GameRoom> {
		return await this.gameRoomRepository.findOne({
			where: {
				id: id
			},
			relations: {
				users: {
					user: true
				},
			}
		})
	}

	async findAll(): Promise<GameRoom[]> {
		return this.gameRoomRepository.find({
			relations: {
				users: {
					user: true
				}
			}
		})
	}

	async findRoomUser(id: number, user: User): Promise<GameRoomUser> {
		return await this.gameRoomUserRepository.findOne({
			where: {
				room: {
					id: id
				},
				user: user
			}
		})
	}

	async isExist(id: number): Promise<boolean> {
		return await this.findOne(id) !== null ? true : false;
	}

	async isExistUser(id:number, client: Socket, name?: string): Promise<boolean> {
		const user = await this.userService.findOne(name === undefined ? await this.wsService.findName(client) : name);
		return await this.findRoomUser(id, user) !== null ? true : false;
	}

	async findRed(id: number): Promise<string> {
		const game = await this.findOne(id);
		for(const user of game.users) {
			if (user.role === Role.RED) return user.user.name;
		}
	}

	async findBlue(id: number): Promise<string> {
		const game = await this.findOne(id);
		for(const user of game.users) {
			if (user.role === Role.BLUE) return user.user.name;
		}
	}

	async enrollQueue(client: Socket, body: any) {
		const name = await this.wsService.findName(client);
		const rule = body.rule;

		if (rule === Rule.RANK) {
			this.rank.push({
				client: client,
				id : client.id,
				name: name
			})
		}

		if (rule === Rule.NORMAL) {
			this.normal.push({
				client: client,
				id : client.id,
				name: name
			})
		}

		if (rule === Rule.ARCADE) {
			this.arcade.push({
				client: client,
				id : client.id,
				name: name
			})
		}
	}

	async cancleQueue(client: Socket, body: any) {
		const rule = body.rule;
		const name = await this.wsService.findName(client);

		client.emit('cancleSearchResult', {
			status: 'approved'
		})

		if (rule === Rule.RANK) {
			this.rank.splice(this.rank.findIndex(elem => elem.name === name), 1);
		}

		if (rule === Rule.NORMAL) {
			this.normal.splice(this.normal.findIndex(elem => elem.name === name), 1);
		}

		if (rule === Rule.ARCADE) {
			this.arcade.splice(this.arcade.findIndex(elem => elem.name === name), 1);
		}

	}

	async joinGameRoom(client: Socket, body: any) {
		const game = await this.findOne(body.roomId);
		const user = await this.userService.findOne(await this.wsService.findName(client));

		client.emit('joinGameRoomResult', {
			status: 'approved',
			roomId: game.id,
		});

		const newGmaeRoomUser = this.gameRoomUserRepository.create({
			room: game,
			user: user,
			role: Role.SPECTATOR
		});
		await this.gameRoomUserRepository.save(newGmaeRoomUser);

		// 게임룸 상태 업데이트
	}

	async exitGameRoom(client: Socket, body: any) {
		const user = await this.userService.findOne(await this.wsService.findName(client));
		const game = await this.findOne(body.roomId);

		client.emit('exitGameRoomResult', {
			status: 'approved',
			roomId: game.id,
		});

		const gameRoomUser = await this.findRoomUser(game.id, user);
		await this.gameRoomUserRepository.remove(gameRoomUser);

		//게임룸 상태 업데이트
	}

	async updateGameRoomList(client: Socket) {
		const list: {
			rule: string,
			red: string,
			blue: string,
		}[] = [];

		const games = await this.findAll();
		for (const game of games) {
			list.push({
				rule: game.rule,
				red: await this.findRed(game.id),
				blue: await this.findBlue(game.id),
			})
		}

		client.emit('message', {
			type: 'gameRoomList',
			list: list,
		});
	}

	async sendResult(game: status) {
		const redClient = await this.wsService.findClient(game.redUser);
		const blueClient = await this.wsService.findClient(game.blueUser);
		const winner = game.redScore === 5 ? 'red' : 'blue';

		if (winner === 'red') {
			redClient.emit('message', {
				type: 'win',
			})
			blueClient.emit('message', {
				type: 'lost',
			})
		} else {
			redClient.emit('message', {
				type: 'lose',
			})
			blueClient.emit('message', {
				type: 'win',
			})
		}

		for (const spectator of game.spectator) {
			let client = await this.wsService.findClient(spectator);
			if (client === undefined) continue;

			client.emit('message', {
				type: 'finish',
				winner: winner,
			})
		}
	}

	async saveHistory(game: status) {
		const redUser = await this.userService.findOne(game.redUser);
		const blueUser = await this.userService.findOne(game.blueUser);
		const winner = game.redScore === 5 ? 'red' : 'blue';
		const newHistory = this.gameHistoryRepository.create({
			red: redUser,
			blue: blueUser,
			winner: winner,
			time: new Date(Date.now()),
		});
		await this.gameHistoryRepository.save(newHistory);
	}

	initGame(game: status) {
			game.ballX = 270;
			game.ballY = 180;
			game.redPaddleX = 0;
			game.redPaddleY = 140;
			game.bluePaddleX = 530;
			game.bluePaddleY = 140;
			game.dx = Math.random() >= 0.5 ? Math.floor(Math.random() * 10) : Math.floor(Math.random() * -10);
			game.dx = Math.random() >= 0.5 ? Math.floor(Math.random() * 10) : Math.floor(Math.random() * -10);
	}

	play(id: number, red: string, blue: string) {
		const game: status = {
			playing: true,
			roomId: id,
			ballX: 270,
			ballY: 180,
			ballRadius: 10,
			dx: Math.random() >= 0.5 ? Math.floor(Math.random() * 10) : Math.floor(Math.random() * -10),
			dy: Math.random() >= 0.5 ? Math.floor(Math.random() * 10) : Math.floor(Math.random() * -10),
			redUser: red,
			redPaddleX: 0,
			redPaddleY: 140,
			redPaddleWidth: 10,
			redPaddleHeight: 80,
			redScore: 0,
			blueUser: blue,
			bluePaddleX: 530,
			bluePaddleY: 140,
			bluePaddleWidth: 10,
			bluePaddleHeight: 80,
			blueScore: 0,
			spectator: [],
		};
		this.rooms.push(game);
		let intervalId = setInterval(() => {
			if (game.playing === false) {
				clearInterval(intervalId);
				// 게임 종료 이벤트, 결과 등록 및 히스토리 등록 등등
				this.sendResult(game);
				this.saveHistory(game);
			}
			game.ballX += game.dx;
			game.ballY += game.dy;

			if (game.ballY + game.dy < game.ballRadius || game.ballY + game.dy > 350) game.dy *= -1;

			if (game.ballX + game.dx < game.ballRadius || game.ballX + game.dx > 530) {

				if ((game.redPaddleY < game.ballY && game.ballY < game.redPaddleY + game.redPaddleHeight) || (game.bluePaddleY < game.ballY && game.ballY < game.bluePaddleY + game.bluePaddleHeight))
					game.dx *= -1;
				else {
					if (game.ballX > 270) { // 레드 승리
						game.redScore++;
					} else { // 블루 승리
						game.blueScore++;
					}

					if (game.redScore === 5 || game.blueScore === 5) {
						game.playing = false;
					}

					this.initGame(game);
				}
			}

			this.wsGateway.server.to('gameRoom' + game.roomId).emit('message', {
				type: 'game',
				status: game,
			})
		}, 30);
	}

	up(id: number, role: string) {
		const room = this.rooms.find(elem => elem.roomId === id);
		if (room.redPaddleY <= 0) return;
		if (room.bluePaddleY <= 0) return;
		if (role === 'red') room.redPaddleY -= 10;
		if (role === 'blue') room.bluePaddleY -= 10; 
	}
	
	down(id: number, role: string) {
		const room = this.rooms.find(elem => elem.roomId === id);
		if (room.redPaddleY >= 280) return;
		if (room.bluePaddleY >= 280) return;
		if (role === 'red') room.redPaddleY += 10;
		if (role === 'blue') room.bluePaddleY += 10;
	}

	










	match() {
		setInterval(async () => {

			if (this.rank.length > 1) {
				let user1 = await this.userService.findOne(this.rank[0].name);
				let user2 = await this.userService.findOne(this.rank[1].name);
				let client1 = this.rank[0].client;
				let client2 = this.rank[1].client;

				this.rank.splice(0, 2);

				let newGame = this.gameRoomRepository.create({
					rule: Rule.RANK,
				});
				await this.gameRoomRepository.save(newGame);

				let newGameUser1 = this.gameRoomUserRepository.create({
					room: newGame,
					user: user1,
					role: Role.RED,
				});

				let newGameUser2 = this.gameRoomUserRepository.create({
					room: newGame,
					user: user2,
					role: Role.BLUE,
				});

				client1.join('gameRoom' + newGame.id);
				client2.join('gameRoom' + newGame.id);
				this.gameRoomUserRepository.save(newGameUser1);
				this.gameRoomUserRepository.save(newGameUser2);
				client1.emit('searchGameResult', {
					status: 'match',
					roomId: newGame.id,
				})
				client2.emit('searchGameResult', {
					status: 'match',
					roomId: newGame.id,
				})

				let clients = await this.wsGateway.server.in('gameRoomList').fetchSockets();
				for (const elem of clients) {
					let elemCLient = await this.wsService.findClient(undefined, elem.id);
					this.updateGameRoomList(elemCLient);
				}

				this.play(newGame.id, user1.name, user2.name);
			} 
			
			if (this.normal.length > 1) {
				let user1 = await this.userService.findOne(this.normal[0].name);
				let user2 = await this.userService.findOne(this.normal[1].name);
				let client1 = this.normal[0].client;
				let client2 = this.normal[1].client;
				
				this.normal.splice(0, 2);
				
				let newGame = this.gameRoomRepository.create({
					rule: Rule.NORMAL,
				});
				await this.gameRoomRepository.save(newGame);
				
				let newGameUser1 = this.gameRoomUserRepository.create({
					room: newGame,
					user: user1,
					role: Role.RED,
				});
				
				let newGameUser2 = this.gameRoomUserRepository.create({
					room: newGame,
					user: user2,
					role: Role.BLUE,
				});
				client1.join('gameRoom' + newGame.id);
				client2.join('gameRoom' + newGame.id);
				this.gameRoomUserRepository.save(newGameUser1);
				this.gameRoomUserRepository.save(newGameUser2);
				client1.emit('searchGameResult', {
					status: 'match',
					roomId: newGame.id,
				})
				client2.emit('searchGameResult', {
					status: 'match',
					roomId: newGame.id,
				})

				let clients = await this.wsGateway.server.in('gameRoomList').fetchSockets();
				for (const elem of clients) {
					let elemCLient = await this.wsService.findClient(undefined, elem.id);
					this.updateGameRoomList(elemCLient);
				}
				this.play(newGame.id, user1.name, user2.name);
			}

			if (this.arcade.length > 1) {
				let user1 = await this.userService.findOne(this.arcade[0].name);
				let user2 = await this.userService.findOne(this.arcade[1].name);
				let client1 = this.arcade[0].client;
				let client2 = this.arcade[1].client;
				
				this.arcade.splice(0, 2);
				
				let newGame = this.gameRoomRepository.create({
					rule: Rule.ARCADE,
				});
				await this.gameRoomRepository.save(newGame);
				
				let newGameUser1 = this.gameRoomUserRepository.create({
					room: newGame,
					user: user1,
					role: Role.RED,
				});
				
				let newGameUser2 = this.gameRoomUserRepository.create({
					room: newGame,
					user: user2,
					role: Role.BLUE,
				});
				client1.join('gameRoom' + newGame.id);
				client2.join('gameRoom' + newGame.id);
				this.gameRoomUserRepository.save(newGameUser1);
				this.gameRoomUserRepository.save(newGameUser2);
				client1.emit('searchGameResult', {
					status: 'match',
					roomId: newGame.id,
				})
				client2.emit('searchGameResult', {
					status: 'match',
					roomId: newGame.id,
				})

				let clients = await this.wsGateway.server.in('gameRoomList').fetchSockets();
				for (const elem of clients) {
					let elemCLient = await this.wsService.findClient(undefined, elem.id);
					this.updateGameRoomList(elemCLient);
				}
				this.play(newGame.id, user1.name, user2.name);
			}

			for (const user of this.rank) {
				user.client.emit('searchGameResult', {
					status: 'searching'
				})
			}
			for (const user of this.normal) {
				user.client.emit('searchGameResult', {
					status: 'searching'
				})
			}
			for (const user of this.arcade) {
				user.client.emit('searchGameResult', {
					status: 'searching'
				})
			}
		}, 1000)
	}
}
