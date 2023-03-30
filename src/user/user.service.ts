import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entity/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private usersRepository: Repository<User>,
	) {}

	findAll(): Promise<User[]> {
		return this.usersRepository.find();
	}

	findOne(username: string): Promise<User> {
		return this.usersRepository.findOneBy({ username });
	}

	async createUser(userInfo: CreateUserDto) {
		const hashedPassword = await bcrypt.hash(userInfo.password, 10);
		const newUser: User = this.usersRepository.create({
      username: userInfo.username,
			password: hashedPassword,
			nickname: userInfo.nickname,
			phone_number: userInfo.phonenumber,
    });

    await this.usersRepository.insert(newUser);
	}


}
