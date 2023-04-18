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

	async findOne(user1: User, user2: User): Promise<Dm> {
		
		return await this.dmRepository.findOne({
			relations: {
				user1: true,
				user2: true,
			},
			where: [
				{ user1: user1, user2: user2 },
				{ user1: user2, user2: user1 },
			],
		});
	}

	async dm(server: Server, client: Socket, body: any) {
		const user1 = await this.userService.findOne(await this.wsService.findName(client));
		const user2 = await this.userService.findOne(body.username);

		client.emit('dmResult', { status: 'approved' });

		let dm = await this.findOne(user1, user2);
		if (dm === null) {
			dm = this.dmRepository.create({
				user1: user1,
				user2: user2,
			})
			await this.dmRepository.save(dm);
		}

		const newHistory = this.dmHistoryRepository.create({
			time: new Date(Date.now()),
			dm: dm,
			user: user1,
			content: body.content,
		})
		await this.dmHistoryRepository.save(newHistory);

		let clients = await server.in(user1.name + user2.name).fetchSockets();
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
			this.updateDmList(elemName, elemClient);
		}
	}

	async updateDmList(name: string, client: Socket) {
		const user = await this.userService.findOne(name);
		const list: {
			username: string,
		} [] = [];
		for (let i = 0; i < user.dm.length; ++i) {
			list.push({
				username: user.dm[i].user1.name === user.name ? user.dm[i].user2.name : user.name,
			});
		}

		client.emit('message', {
			type: 'dmList',
			list: list,
		});
	}
}

