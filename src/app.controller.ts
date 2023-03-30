import { Controller, Get, Post, Body, Request, Res, UseGuards, NotFoundException} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { User } from './user/entity/user.entity';
import { CreateUserDto } from './user/dto/create-user.dto';
import { PhoneNumberDto } from './auth/dto/phone-number.dto';
import { Response } from 'express'

@Controller()
export class AppController {
	constructor(
		private authService: AuthService,
		private userService: UserService,
	) {}
	
	@UseGuards(AuthGuard('jwt'))
	@Get('get/profile')
	getOwnProfile(@Request() req): Promise<User> {
		return this.userService.findOne(req.nickname);
	}
	
	@UseGuards(AuthGuard('local'))
	@Post('login')
	async login(@Request() req) {
		return this.authService.login(req.user);
	}


	@Post('create/user')
	createUser(@Body() userInfo: CreateUserDto) {
		this.userService.createUser(userInfo);
	}

}


