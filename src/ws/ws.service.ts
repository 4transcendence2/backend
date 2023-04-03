import { Injectable, forwardRef, Inject } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { ChatRoom } from 'src/chat/entity/chat-room.entity';
// import { User } from 'src/user/entity/user.entity';
// import { Repository } from 'typeorm';
import { Socket, Server } from 'socket.io';
import { UserService } from 'src/user/user.service';
import { ChatService } from 'src/chat/chat.service';

interface connectedUserInfo {
	username: string,
	clientId: string
}

const userList: connectedUserInfo[] = [];

@Injectable()
export class WsService {

	constructor(
		// @InjectRepository(ChatRoom)
		// private chatRoomRepository: Repository<ChatRoom>,

		// @InjectRepository(User)
		// private usersRepository: Repository<User>,

		private userService: UserService,

		@Inject(forwardRef(() => ChatService))
		private chatService: ChatService,
	) {}

	async addUser(username: string, clientId: string): Promise<boolean>{
		const result = userList.find(element => element.username === username);
		if (result === undefined) {
			userList.push({
				username: username,
				clientId: clientId,
			});
			return true;
		}
		return false;
	}

	async deleteUser(clientId: string) {
		const index = userList.findIndex(element => element.clientId === clientId);
		if (index !== -1) {
			userList.splice(index, 1);
		}
	}

	async getConnectingUser() {
		return userList;
	}
	

	async findUserByClientId(clientId: string): Promise<string> {
		if (userList.length > 0)
			return userList.find(element => element.clientId === clientId).username;
		return undefined;
	}

	async findClientIdByUsername(username: string): Promise<string> {
		if (userList.length > 0)
			return userList.find(element => element.username === username).clientId;
		return undefined;
	}


	async isLogin(client?: Socket, username?: string): Promise<boolean> {
		if (client !== undefined) {
			const username = await this.findUserByClientId(client.id);
			if (username === undefined) return false;
			return true;
		}

		if (username !== undefined) {
			const clientId = await this.findClientIdByUsername(username);
			if (clientId === undefined) return false;
			return true;
		}
	}


	async updateUsers(server: Server) {
		let tmpList: {
			username: string,
		}[] = [];
		(await this.getConnectingUser()).forEach(async element => {
			tmpList.push({
				username: element.username,
			})
		});
		server.emit('updateuUsers', tmpList);
	}

	async updateFriend(server: Server, client: Socket) {
		const list = await this.getConnectingUser();
		const username = await this.findUserByClientId(client.id);

		list.forEach(async element => {
			let user = await this.userService.findOne(element.username);
			if (user.friend_list === null || user.friend_list.length === 0) {}
			else {
				if ((user.friend_list.find(elem => elem === username)) !== undefined) {
					let tmpList: {
						username: string,
						status: string,
					} [] = [];

					user.friend_list.forEach(async elem2 => {
						let tmpUser = await this.userService.findOne(elem2);
						tmpList.push({
							username: tmpUser.username,
							status: tmpUser.status,
						})
					})
					let socket = server.of('/').sockets.get(await this.findClientIdByUsername(element.username));
					socket.emit('updateFriend', tmpList);
				}
			}
		})
	}

	async	initUpdate(server: Server, client: Socket) {
		await this.chatService.updateChatRoomList(server, client);
		await this.chatService.updateMyChatRoomList(client);
		await this.updateFriend(server, client);
		// DM LIST
		// GAME ROOM LIST
	}

 

}
