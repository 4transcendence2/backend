import { Body, Controller, Get, Param, Post, Headers, Res, Put, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { CreateUserDto } from './dto/user.create.dto';
import { UserService } from './user.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { SignupJwtGuard } from 'src/auth/signup_jwt/signupJwt.guard';
import { join } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { GameService } from 'src/game/game.service';
const fs = require('fs');
require('dotenv').config();

@Controller('user')
export class UserController {
	constructor(
		private userService: UserService,
		private gameService: GameService,

	) { }


	@UseGuards(AuthGuard('jwt'))
	@Get('profile/:username')
	async getProfile(@Param('username') username, @Res() res: Response) {
		const user = await this.userService.findOne(username);

		if (user === null) {
			res.status(400);
			return res.json({
				status: "error",
				detail: "Not exist username",
			})
		}

		return res.json({
			username: user.username,
			status: user.status,
			rating: user.rating,
			win: user.win,
			lose: user.lose,
			game_history: await this.gameService.findHistory(user.username, 10),
		})
	}



	@UseGuards(AuthGuard('jwt'))
	@Get('avatar/:username')
	async getAvatar(@Param('username') username, @Res() res: Response) {
		const user = await this.userService.findOne(username);
		if (user === null) {
			res.status(400);
			return res.json({
				status: "error",
				detail: "Not exist username",
			})
		}

		const filePath = join(__dirname, '..', '..', 'public', user.avatar_path);
		fs.access(filePath, fs.constants.F_OK, (err) => {
			if (err) {
				res.status(404);
				return res.json({
					status: "error",
					detail: "This user's profile file is damaged. Try again after update user's porifle.",
				})
			} else {
				res.sendFile(filePath);
			}
		})
	}


	@UseGuards(AuthGuard('jwt'))
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
		const data = file.buffer;
		const token = header['authorization'].split(" ")[1];
		const decodedToken = jwt.verify(token, process.env.SECRET);
		const username = decodedToken['username'];
		fs.writeFile(join(__dirname, '..', '..', 'public', 'avatar', username + '.png'), data, (err) => {
			if (err) console.log(err);
		})
		await this.userService.updateAvatar(username, join('avatar', username + '.png'));
	}


	@UseGuards(SignupJwtGuard)
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
