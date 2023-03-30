import { AuthService } from './auth.service';
import { PhoneNumberDto } from './dto/phone-number.dto';
import { Response } from 'express';
import { OtpDto } from './dto/otp.dto';
import { JwtService } from '@nestjs/jwt';
export declare class AuthController {
    private authService;
    private jwtService;
    constructor(authService: AuthService, jwtService: JwtService);
    login(req: any): Promise<{
        status: string;
        access_token: string;
    }>;
    sendLoginOtp(body: PhoneNumberDto): Promise<void>;
    sendSignupOtp(body: PhoneNumberDto): Promise<void>;
    checkLoginOtp(req: any, body: OtpDto, res: Response): Promise<Response<any, Record<string, any>>>;
    checkSignupOtp(req: any, body: OtpDto, res: Response): Promise<Response<any, Record<string, any>>>;
}
