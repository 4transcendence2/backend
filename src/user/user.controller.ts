import { Body, Controller, Get, Param, Post, Headers, Res, Request, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Inject, forwardRef } from '@nestjs/common';
import { CreateUserDto } from './dto/user.create.dto';
import { UserService } from './user.service';
import { UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { TempJwtGuard } from 'src/auth/temp_jwt/tempJwt.guard';
import { AuthService } from 'src/auth/auth.service';
import { join } from 'path';
import { SignupJwtGuard } from 'src/auth/signup_jwt/signupJwt.guard';
import { AuthGuard } from '@nestjs/passport';
const fs = require('fs');
require('dotenv').config();

@Controller('user')
export class UserController {
	constructor(
		private userService: UserService,

		@Inject(forwardRef(() => AuthService))
		private authService: AuthService,
	) {}


	@UseGuards(AuthGuard('jwt'))
	@Get('profile/:name')
	async getProfile(@Param('name') name, @Request() req, @Res() res: Response) {
		try {
			const result = await this.userService.getProfile(req.user.username, name);
			return res.json(result);
		} catch (err) {
			res.status(404);
			return res.json({
				status: "error",
				detail: err.message,
			})
		}
	}

	@UseGuards(AuthGuard('jwt'))
	@Get('is2fa')
	async is2FA(@Request() req: any, @Res() res: Response) {
		return res.json({
			status: await this.userService.is2FA(req.user.username),
		})
	}

	@UseGuards(AuthGuard('jwt'))
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


	@UseGuards(AuthGuard('jwt'))
	@Get('badge/:achievement')
	async getBadge(@Param('achievement') achievement, @Res() res: Response) {
		if (achievement !== 'win3' && achievement !== 'win5' && achievement !== 'win10') {
			res.status(404);
			return res.json({
				status: "error",
				detail: "존재하지 않는 업적입니다.",
			})
		}
		res.setHeader('Content-Type', 'image/png');
		res.send(fs.readFileSync(join(__dirname, `../../public/${achievement}.png`)));
		return;
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
	) file: Express.Multer.File, @Request() req) {
		try {
			await this.userService.updateAvatar(req.user.username, file.buffer);
		} catch (err) {
			console.log(err);
		}
	}


	@UseGuards(SignupJwtGuard)
	@Post('create')
	async createUser(@Request() req, @Body() info: CreateUserDto, @Res() res: Response) {
		try {
			await this.userService.createUser(req.user.intraId, info.username);
			res.status(201);
			return res.json({
				status: 'approved',
				detail: "User is created",
				accessToken: this.authService.publishToken(req.user.intraId, info.username),
			})
		} catch (error) {
			res.status(400);
			return res.json({
				status: 'error',
				detail: '중복된 username 또는 intraId 입니다.',
			})
		}
	}

	// test code
	@Get('create/test')
	async createTest() {
		try {
			await this.userService.createTest();
			return;
		} catch (err) {
			return err;
		}
	}
}
