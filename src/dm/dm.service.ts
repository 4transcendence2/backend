import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Socket, Server } from 'socket.io';
import { Dm } from './entity/dm.entity';
import { Repository } from 'typeorm';
import { User } from 'src/user/entity/user.entity';
import { WsService } from 'src/ws/ws.service';
import { UserService } from 'src/user/user.service';
import { DmHistory } from './entity/dm.history';

@Injectable()
export class DmService {
	constructor(
		@InjectRepository(Dm)
		private dmRepository: Repository<Dm>,

		@InjectRepository(DmHistory)
		private dmHistoryRepository: Repository<DmHistory>,

		@Inject(forwardRef(() => WsService))
		private wsService: WsService,

		@Inject(forwardRef(() => UserService))
		private userService: UserService,

	) {}

	async findAll(user: User): Promise<Dm[]> {
		return await this.dmRepository.find({
			relations: {
				from: true,
				to: true,
				history: {
					user: true,
				}
			},
			where: [
				{ from: user },
				{ to: user },
			]
		})
	}

	async findOne(user1: User, user2: User): Promise<Dm> {

		let dm = await this.dmRepository.findOne({
			relations: {
				from: true,
				to: true,
				history: {
					user: true,
				}
			},
			where: {
				from: user1,
				to: user2,
			}
		});
		if ( dm === null ) {
			dm = await this.dmRepository.findOne({
				relations: {
					from: true,
					to: true,
					history: {
						user: true,
					}
				},
				where: {
					from: user2,
					to: user1,
				},
			});
		}
		return dm;
	}

	async createOne(user1: User, user2: User): Promise<Dm> {
		const dm = this.dmRepository.create({
			from: user1,
			to: user2,
		})
		await this.dmRepository.save(dm);
		return dm;
	}

	async isExist(user1: User, user2: User): Promise<boolean> {
		const dm = await this.findOne(user1, user2);
		return dm === null ? false : true;
	}

	async dm(server: Server, client: Socket, body: any) {
		const user1 = await this.userService.findOne(await this.wsService.findName(client));
		const user2 = await this.userService.findOne(body.username);

		client.emit('dmResult', { status: 'approved' });

		let dm = await this.findOne(user1, user2);
		if (dm === null) {
			dm = await this.createOne(user1, user2);
		}
		const newHistory = this.dmHistoryRepository.create({
			time: new Date(Date.now()),
			dm: dm,
			user: user1,
			content: body.content,
		})
		await this.dmHistoryRepository.save(newHistory);

		let clients = await server.in('dm' + dm.id).fetchSockets();
		for (const elem of clients) {
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			elemClient.emit('message', {
				type: 'dm',
				from: user1.name,
				content: body.content,
			});
		}

		clients = await server.in('dmList').fetchSockets();
		for (const elem of clients) {
			let elemName = await this.wsService.findName(undefined, elem.id);
			let elemClient = await this.wsService.findClient(undefined, elem.id);
			if (elemName === user1.name || elemName === user2.name)
				this.updateDmList(elemName, elemClient);
		}
	}

	async exit(server: Server, client: Socket, body: any) {
		
	}

	async updateDmList(name: string, client: Socket) {
		const user = await this.userService.findOne(name);
		const dm = await this.findAll(user);
		const list: {
			username: string,
			content: string,
		} [] = [];
		

		for (let i = 0; i < dm.length; ++i) {
			if (dm[i].history.length === 0) continue;
			const history = await this.dmHistoryRepository.findOne({
				where: {
					dm: dm[i],
				},
				order: {
					time: 'DESC'
				},
			})
			list.push({
				username: dm[i].from.name === user.name ? dm[i].to.name : dm[i].from.name,
				content: history !== null ? history.content : undefined,
			});
		}

		client.emit('message', {
			type: 'dmList',
			list: list,
		});
	}

	async sendHistory(client: Socket, body: any) {
		const user1 = await this.userService.findOne(await this.wsService.findName(client));
		const user2 = await this.userService.findOne(body.username);
		const dm = await this.findOne(user1, user2);
		if (dm === null) return ;

		const histories = dm.history;

		let list: {
			from: string,
			content: string,
		} [] = [];

		for(const history of histories) {
			list.push({
				from: history.user.name,
				content: history.content,
			})
		}
		client.emit('message', {
			type: 'history',
			list: list,
		});
	}

	
}

