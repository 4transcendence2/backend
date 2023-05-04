import { Body, Controller, Get, Param, Post, Headers, Res, Request, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { CreateUserDto } from './dto/user.create.dto';
import { UserService } from './user.service';
import { UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { TempJwtGuard } from 'src/auth/temp_jwt/tempJwt.guard';
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
	@Get('profile/:name')
	async getProfile(@Param('name') name, @Request() req, @Res() res: Response) {
		try {
			const result = await this.userService.getProfile(req.user.name, name);
			return res.json(result);
		} catch (err) {
			res.status(404);
			return res.json({
				status: "error",
				detail: err.message,
			})
		}
	}

	// @UseGuards(AuthGuard('jwt'))
	@UseGuards(TempJwtGuard)
	@Get('avatar/:name')
	async getAvatar(@Param('name') name, @Res() res: Response) {
		const user = await this.userService.findOne(name);
		if (user === null) {
			res.status(404);
			return res.json({
				status: "error",
				detail: "존재하지 않는 유저입니다.",
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
	) file: Express.Multer.File, @Request() req) {
		try {
			await this.userService.updateAvatar(req.user.name, file.buffer);
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
