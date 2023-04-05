import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GameHistory } from './entity/game.history.entiry';
import { Repository } from 'typeorm';

@Injectable()
export class GameService {
	constructor(

		@InjectRepository(GameHistory)
		private gameHistoryRepository: Repository<GameHistory>

	) {}

	async createRoom() {
		const newHistory: GameHistory = this.gameHistoryRepository.create({
			blue: "sorksoek2",
			red: "alsfkjkald",
			type: "normal"
		})
		await this.gameHistoryRepository.insert(newHistory);
	}
	
	async findHistory(username: string, howmay: number): Promise<GameHistory[]> {
		try {
			const result = await this.gameHistoryRepository
			.createQueryBuilder('history')
			.where('history.red LIKE :username OR history.blue LIKE :username', { username: `%${username}%`})
			.orderBy('history.uniqueId', 'DESC')
			.take(howmay)
			.getMany();

			return result;
		} catch {
			return [];
		}
	}



}
