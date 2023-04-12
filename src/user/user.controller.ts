import { Body, Controller, Get, Param, Post, Headers, Res, Put, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { CreateUserDto } from './dto/user.create.dto';
import { UserService } from './user.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { SignupJwtGuard } from 'src/auth/signup_jwt/signupJwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { GameService } from 'src/game/game.service';
import { TempJwtGuard } from 'src/auth/temp_jwt/tempJwt.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { AuthService } from 'src/auth/auth.service';
const fs = require('fs');
require('dotenv').config();

@Controller('user')
export class UserController {
	constructor(
		private userService: UserService,
		private authService: AuthService,
	) {}

	// @UseGuards(AuthGuard('jwt'))
	@UseGuards(TempJwtGuard)
	@Get('profile/:username')
	async getProfile(@Headers() header, @Param('username') username, @Res() res: Response) {
		const user = await this.userService.findOne(username);

		if (user === null) {
			res.status(400);
			return res.json({
				status: "error",
				detail: "Not exist username",
			})
		}

		const token = header['authorization'].split(" ")[1];
		const decodedToken = jwt.verify(token, process.env.TMP_SECRET);
		const reqUsername = decodedToken['username'];

		let relation: string;
		if (reqUsername === username) {
			relation = 'myself';
		} else {
			const reqUser = await this.userService.findOne(reqUsername);
			if (reqUser.friend_list === null || reqUser.friend_list.length === 0) {
				relation = 'others';
			} else {
				const result = reqUser.friend_list.find(element => element === username);
				relation = result !== undefined ? 'friend' : 'others'
			}
		}


		return res.json({
			username: user.username,
			status: user.status,
			rating: user.rating,
			win: user.win,
			lose: user.lose,
			relation: relation,
			gameHistory: await this.gameService.findHistory(user.username, 10),
		})
	}


	// @UseGuards(AuthGuard('jwt'))
	@UseGuards(TempJwtGuard)
	@Get('avatar/:username')
	async getAvatar(@Param('username') username, @Res() res: Response) {
		const user = await this.userService.findOne(username);
		if (user === null) {
			res.status(400);
			return res.json({
				status: "error",
				detail: "Not exist user",
			})
		}
		
		res.setHeader('Content-Type', 'image/png');
		res.send(user.avatar);
	}


	// @UseGuards(AuthGuard('jwt'))
	@UseGuards(TempJwtGuard)
	@Post('avatar')
	@UseInterceptors(FileInterceptor('avatar'))
	async updateAvatar(@UploadedFile(
		new ParseFilePipe({
			validators: [
				new MaxFileSizeValidator({ maxSize: 20000 }),
				new FileTypeValidator({ fileType: 'image/png' }),
			]
		})
	) file: Express.Multer.File, @Headers() header) {
		try {
			const name = await this.authService.decodeToken(header, process.env.TMP_SECRET);
			await this.userService.updateAvatar(name, file.buffer);
		} catch (err) {
			console.log(err);
		}
	}


	// @UseGuards(SignupJwtGuard)
	@Post('create')
	async createUser(@Body() userInfo: CreateUserDto, @Res() res: Response) {
		try {
			await this.userService.createUser(userInfo);
			res.status(201);
			return res.json({
				status: 'approved',
				detail: "User is created",
			});
		} catch (error) {
			res.status(400);
			return res.json({
				status: error.severity,
				detail: error.detail,
			})
		}
	}
}
