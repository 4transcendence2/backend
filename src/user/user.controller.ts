import { Body, Controller, Get, Param, Post, Headers, Res } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { SignupJwtGuard } from 'src/auth/signup_jwt/signupJwt.guard';
require('dotenv').config();

@Controller('user')
export class UserController {
	constructor(
		private userService: UserService,
		) {}

	

	@UseGuards(AuthGuard('jwt'))
	@Get('profile/')
	findOne(@Headers() header: any) {
		const token = header['authorization'].split(" ")[1];
		const decodedToken = jwt.verify(token, process.env.SECRET);
		return this.userService.findOne(decodedToken['username']);
	}

	@UseGuards(SignupJwtGuard)
	@Post('create')
	async createUser(@Body() userInfo: CreateUserDto, @Res() res: Response) {
		try {
			await this.userService.createUser(userInfo);
			res.status(201);
			return res.json({
				status: 'approved',
			});
		} catch (error) {
			res.status(400);
			return res.json({
				status:	error.severity,
				detail:	error.detail,
			})
		}
	}


}
