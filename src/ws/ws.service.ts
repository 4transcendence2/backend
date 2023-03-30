import { Injectable } from '@nestjs/common';

interface connectedUserInfo {
	username: string,
	clientId: string
}

const userList: connectedUserInfo[] = [];

@Injectable()
export class WsService {

	constructor(
	) {}

	async addUser(username: string, clientId: string) {
		const result = userList.find(element => element.username === username);
		if (result === undefined) {
			userList.push({
				username: username,
				clientId: clientId,
			});
		}
	}

	async deleteUser(clientId: string) {
		const index = userList.findIndex(element => element.clientId === clientId);
		if (index !== -1) {
			userList.splice(index, 1);
		}
	}


	async findUserByClientId(clientId: string): Promise<string> {
		return userList.find(element => element.clientId === clientId).username;
	}

	async findClientIdByUsername(username: string): Promise<string> {
		return userList.find(element => element.username === username).clientId;
	}
	

}
