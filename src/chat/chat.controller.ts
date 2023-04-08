import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Dm from './entity/chat.dm.entity';
import { Repository } from 'typeorm';
import { User } from 'src/user/entity/user.entity';
import { UserService } from 'src/user/user.service';


@Controller('chat')
export class ChatController {
	constructor( 
		@InjectRepository(Dm)
		private dmRepository: Repository<Dm>,


		@InjectRepository(User)
		private usersRepository: Repository<User>,

		private userService: UserService,
	) {}


	@Get()
	async test() {
		const user = await this.userService.findOne('sorksoek2');
		console.log(typeof(user.dm_list));
	}
}
