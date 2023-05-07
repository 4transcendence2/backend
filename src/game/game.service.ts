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
import { UserStatus } from 'src/user/user.status';


interface queue {
	client: Socket,
	name: string,
	id: string,
};

interface status {
	playing: boolean,
	roomId: number,
	rule: string,
	ballX: number,
	ballY: number,
	ball2X: number | null,
	ball2Y: number | null,
	ballRadius: number,
	ball2Radius: number | null,
	dx: number,
	dy: number,
	dx2: number | null,
	dy2: number | null,
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

interface invitation {
	fromClient: Socket,
	from: string,
	toClient: Socket,
	to: string,
	rule: string,
	status: string,
	timer: number,
}

@Injectable()
export class GameService {

	public rank: queue[] = [];
	public normal: queue[] = [];
	public arcade: queue[] = [];
	public invitationList: invitation[] = [];
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

	async findHistory(user: User): Promise<GameHistory[]> {
		return await this.gameHistoryRepository.find({
			where: [
				{red: user},
				{blue: user},
			],
			relations: {
				red: true,
				blue: true,
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

	async inviteGame(client: Socket, body: any) {
		const from = await this.userService.findOne(await this.wsService.findName(client));
		const to = await this.userService.findOne(body.username);

		const invitation: invitation = {
			fromClient: client,
			from: from.name,
			toClient: null,
			to: to.name,
			rule: body.rule,
			status: 'waiting',
			timer: 0,
		};

		this.invitationList.push(invitation);

		let intervalId = setInterval(async () => {

			if (invitation.timer === 10) {
				clearInterval(intervalId);
				client.emit('inviteGameResult', {
					username: to.name,
					status: 'decline',
				});
				let index = this.invitationList.findIndex(elem => elem.from === from.name);
				this.invitationList.splice(index, 1);
				return;
			}

			if (invitation.status === 'accept') {
				clearInterval(intervalId);
				let index = this.invitationList.findIndex(elem => elem.from === from.name);
				this.invitationList.splice(index, 1);
				
				let newGame = this.gameRoomRepository.create({
					rule: body.rule,
				});
				await this.gameRoomRepository.save(newGame);
				
				client.emit('inviteGameResult', {
					username: to.name,
					status: 'accept',
					roomId: newGame.id,
				});

				invitation.toClient.emit('acceptGameResult', {
					username: body.username,
					status: 'approved',
					roomId: newGame.id,
				})

				let newGameUser1 = this.gameRoomUserRepository.create({
					room: newGame,
					user: from,
					role: Role.RED,
				});

				let newGameUser2 = this.gameRoomUserRepository.create({
					room: newGame,
					user: to,
					role: Role.BLUE,
				});

				client.join('gameRoom' + newGame.id);
				(await this.wsService.findClient(body.username)).join('gameRoom' + newGame.id);
				this.gameRoomUserRepository.save(newGameUser1);
				this.gameRoomUserRepository.save(newGameUser2);

				let clients = await this.wsGateway.server.in('gameRoomList').fetchSockets();
				for (const elem of clients) {
					let elemCLient = await this.wsService.findClient(undefined, elem.id);
					this.updateGameRoomList(elemCLient);
				}
				this.play(newGame.id, newGame.rule, from.name, to.name);
				return;
			}

			if (invitation.status === 'decline') {
				clearInterval(intervalId);
				client.emit('inviteGameResult', {
					username: to.name,
					status: 'decline',
				});
				let index = this.invitationList.findIndex(elem => elem.from === from.name);
				this.invitationList.splice(index, 1);
				return;
			}

			invitation.timer++;
			client.emit('inviteGameResult', {
				username: to.name,
				status: 'waiting'
			});
		}, 1000)

		let clients = await this.wsGateway.server.in('gameInvitation').fetchSockets();
		for (const elem of clients) {
			let elemName = await this.wsService.findName(undefined, elem.id);
			let elemClient = await this.wsService.findClient(undefined, elem.id);

			if (elemName === to.name) {
				elemClient.emit('message', {
					type: 'gameInvitation',
					from: from.name
				})
			}
		}
	}

	async acceptGame(client: Socket, body: any) {
		// client.emit('acceptGameResult', {
		// 	username: body.username,
		// 	status: 'approved',
		// });
		const invitation = this.invitationList.find(elem => elem.from = body.username);
		invitation.status = 'accept';
		invitation.toClient = client;
	}
	
	async declineGame(client: Socket, body: any) {
		client.emit('declineGameResult', {
			username: body.username,
			status: 'approved',
		});
		const invitation = this.invitationList.find(elem => elem.from = body.username);
		invitation.status = 'decline';
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


		const gameRoomUser = await this.findRoomUser(game.id, user);
		if (gameRoomUser !== null) return;

		const newGmaeRoomUser = this.gameRoomUserRepository.create({
			room: game,
			user: user,
			role: Role.SPECTATOR
		});
		await this.gameRoomUserRepository.save(newGmaeRoomUser);

		const room = this.rooms.find(elem => elem.roomId === game.id);
		room.spectator.push(user.name);
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

		await this.userService.updateStatus(user.name, UserStatus.LOGIN);

		//게임룸 상태 업데이트
		const room = this.rooms.find(room => room.roomId === game.id);


		if (room.redUser === user.name) { //레드가 나가면
			room.blueScore = 5;
		} else if (room.blueUser === user.name) { // 블루가 나가면
			room.redScore = 5;
		} else { // 관전자가 나가면
			let index = room.spectator.findIndex(elem => elem === user.name);
			if (index !== -1) room.spectator.splice(index, 1);
		}

	}

	async updateGameRoomList(client: Socket) {
		const list: {
			roomId: number,
			rule: string,
			red: string,
			blue: string,
		}[] = [];

		const games = await this.findAll();
		for (const game of games) {
			list.push({
				roomId: game.id,
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
				roomId: game.roomId,
			})
			blueClient.emit('message', {
				type: 'lose',
				roomId: game.roomId,
			})
		} else {
			redClient.emit('message', {
				type: 'lose',
				roomId: game.roomId,
			})
			blueClient.emit('message', {
				type: 'win',
				roomId: game.roomId,
			})
		}

		for (const spectator of game.spectator) {
			let client = await this.wsService.findClient(spectator);
			if (client === undefined) continue;

			client.emit('message', {
				type: 'finish',
				roomId: game.roomId,
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
			red_score: game.redScore,
			blue: blueUser,
			blue_score: game.blueScore,
			winner: winner,
			time: new Date(Date.now()),
			rule: game.rule,
		});

		if (winner === 'red') {
			await this.userService.win(game.redUser);
			await this.userService.lose(game.blueUser);
			if (game.rule === Rule.RANK) {
				await this.userService.plus(game.redUser);
				await this.userService.minus(game.blueUser);
			}
		} else {
			await this.userService.win(game.blueUser);
			await this.userService.lose(game.redUser);
			if (game.rule === Rule.RANK) {
				await this.userService.plus(game.redUser);
				await this.userService.minus(game.blueUser);
			}
		}
		await this.gameHistoryRepository.save(newHistory);


		const gameRoom = await this.findOne(game.roomId);
		// 나가기 처리
		const roomUsers = await this.gameRoomUserRepository.find({
			where: {
				room: gameRoom
			},
		});

		for (const roomUser of roomUsers) {
			await this.gameRoomUserRepository.remove(roomUser);
		}
		await this.gameRoomRepository.remove(gameRoom);

		this.userService.updateStatus(redUser.name, UserStatus.LOGIN);
		this.userService.updateStatus(blueUser.name, UserStatus.LOGIN);
	}

	initGame(game: status) {
			game.ballX = 270;
			game.ballY = 180;
			game.redPaddleX = 0;
			game.redPaddleY = 140;
			game.bluePaddleX = 530;
			game.bluePaddleY = 140;
			game.dx = Math.random() >= 0.5 ? Math.floor(Math.random() * 10) + 5 : Math.floor(Math.random() * -10) - 5;
			game.dx = Math.random() >= 0.5 ? Math.floor(Math.random() * 10) + 3 : Math.floor(Math.random() * -10) - 3;
			game.ball2X = game.rule === Rule.ARCADE ? 270 : null;
			game.ball2Y = game.rule === Rule.ARCADE ? 180 : null;
			game.ball2Radius = game.rule === Rule.ARCADE ? 10 : null;
			game.dx2 = game.rule === Rule.ARCADE ? Math.random() >= 0.5 ? Math.floor(Math.random() * 10) + 5 : Math.floor(Math.random() * -10) - 5 : null;
			game.dy2 = game.rule === Rule.ARCADE ? Math.random() >= 0.5 ? Math.floor(Math.random() * 10) + 3 : Math.floor(Math.random() * -10) - 3 : null;
	}

	play(id: number, rule: string, red: string, blue: string) {
		const game: status = {
			playing: true,
			rule: rule,
			roomId: id,
			ballX: 270,
			ballY: 180,
			ball2X: rule === Rule.ARCADE ? 270 : null,
			ball2Y: rule === Rule.ARCADE ? 180 : null,
			ballRadius: 10,
			ball2Radius: rule === Rule.ARCADE ? 10 : null,
			dx: Math.random() >= 0.5 ? Math.floor(Math.random() * 10) + 5 : Math.floor(Math.random() * -10) - 5,
			dy: Math.random() >= 0.5 ? Math.floor(Math.random() * 10) + 3 : Math.floor(Math.random() * -10) - 3,
			dx2: rule === Rule.ARCADE ? Math.random() >= 0.5 ? Math.floor(Math.random() * 10) + 5 : Math.floor(Math.random() * -10) - 5 : null,
			dy2: rule === Rule.ARCADE ? Math.random() >= 0.5 ? Math.floor(Math.random() * 10) + 3 : Math.floor(Math.random() * -10) - 3 : null,
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
		let intervalId = setInterval(async () => {
			if (game.playing === false) {
				clearInterval(intervalId);
				// 게임 종료 이벤트, 결과 등록 및 히스토리 등록 등등
				await this.sendResult(game);
				await this.saveHistory(game);
				return;
			}
			game.ballX += game.dx;
			game.ballY += game.dy;

			if (rule === Rule.ARCADE) {
				game.ball2X += game.dx2;
				game.ball2Y += game.dy2;
			}

			if (game.redScore === 5 || game.blueScore === 5) {
				game.playing = false;
				return;
			}

			if (rule === Rule.ARCADE) {
				if (game.ball2Y + game.dy2 < game.ball2Radius || game.ball2Y + game.dy2 > 350) game.dy2 *= -1;

				if (game.ball2X + game.dx2 < game.ball2Radius) {
				
					if (game.redPaddleY < game.ball2Y && game.ball2Y < game.redPaddleY + game.redPaddleHeight) // 레드 사이드
						game.dx2 *= -1;
					else {
						game.blueScore++;
						this.initGame(game);
					}
				}
	
				if (game.ball2X + game.dx2 > 530) { // 블루 사이드
					if (game.bluePaddleY < game.ball2Y && game.ball2Y < game.bluePaddleY + game.bluePaddleHeight)
						game.dx2 *= -1;
					else {
						game.redScore++;
						this.initGame(game);
					}
				}
			}

			if (game.ballY + game.dy < game.ballRadius || game.ballY + game.dy > 350) game.dy *= -1;

			if (game.ballX + game.dx < game.ballRadius) {
				
				if (game.redPaddleY < game.ballY && game.ballY < game.redPaddleY + game.redPaddleHeight) // 레드 사이드
					game.dx *= -1;
				else {
					game.blueScore++;
					this.initGame(game);
				}
			}

			if (game.ballX + game.dx > 530) { // 블루 사이드
				if (game.bluePaddleY < game.ballY && game.ballY < game.bluePaddleY + game.bluePaddleHeight)
					game.dx *= -1;
				else {
					game.redScore++;
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

		if (role === 'red') {
			if (room.redPaddleY <= 0)
				return;
			room.redPaddleY -= 10;
		}

		if (role === 'blue') {
			if (room.bluePaddleY <= 0)
				return;
			room.bluePaddleY -= 10; 
		}

	}

	down(id: number, role: string) {
		const room = this.rooms.find(elem => elem.roomId === id);

		if (role === 'red') {
			if (room.redPaddleY >= 280)
				return;
			room.redPaddleY += 10;
		}

		if (role === 'blue') {
			if (room.bluePaddleY >= 280)
				return;
			room.bluePaddleY += 10;
		}
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
				await this.userService.updateStatus(user1.name, UserStatus.GAMING);
				await this.userService.updateStatus(user2.name, UserStatus.GAMING);
				let clients = await this.wsGateway.server.in('gameRoomList').fetchSockets();
				for (const elem of clients) {
					let elemCLient = await this.wsService.findClient(undefined, elem.id);
					this.updateGameRoomList(elemCLient);
				}

				this.play(newGame.id, newGame.rule, user1.name, user2.name);
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

				await this.userService.updateStatus(user1.name, UserStatus.GAMING);
				await this.userService.updateStatus(user2.name, UserStatus.GAMING);
				let clients = await this.wsGateway.server.in('gameRoomList').fetchSockets();
				for (const elem of clients) {
					let elemCLient = await this.wsService.findClient(undefined, elem.id);
					this.updateGameRoomList(elemCLient);
				}
				this.play(newGame.id, newGame.rule, user1.name, user2.name);
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

				await this.userService.updateStatus(user1.name, UserStatus.GAMING);
				await this.userService.updateStatus(user2.name, UserStatus.GAMING);
				let clients = await this.wsGateway.server.in('gameRoomList').fetchSockets();
				for (const elem of clients) {
					let elemCLient = await this.wsService.findClient(undefined, elem.id);
					this.updateGameRoomList(elemCLient);
				}
				this.play(newGame.id, newGame.rule, user1.name, user2.name);
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
