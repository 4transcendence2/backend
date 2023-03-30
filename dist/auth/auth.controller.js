"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const auth_service_1 = require("./auth.service");
const phone_number_dto_1 = require("./dto/phone-number.dto");
const signup_service_1 = require("../signup/signup.service");
const otp_dto_1 = require("./dto/otp.dto");
const login_guard_1 = require("../login/login.guard");
const jwt_1 = require("@nestjs/jwt");
let AuthController = class AuthController {
    constructor(authService, jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }
    async login(req) {
        return this.authService.login(req.user);
    }
    async sendLoginOtp(body) {
        await this.authService.sendOtp(body.phonenumber);
    }
    async sendSignupOtp(body) {
        await this.authService.sendOtp(body.phonenumber);
    }
    async checkLoginOtp(req, body, res) {
        try {
            const result = await this.authService.checkOtp(body.otp);
            if (result.status === 'approved') {
                return res.json({
                    status: "approved",
                    access_token: this.jwtService.sign(req.user),
                });
            }
            if (result.status === 'pending') {
                return res.json({
                    status: "pending",
                    detail: "Invalid Token",
                });
            }
        }
        catch (error) {
            res.status(404);
            return res.json({
                status: "error",
                detail: 'Invaild Verification Check Request'
            });
        }
    }
    async checkSignupOtp(req, body, res) {
        try {
            const result = await this.authService.checkOtp(body.otp);
            if (result.status === 'approved') {
                return res.json({
                    status: "approved",
                });
            }
            if (result.status === 'pending') {
                return res.json({
                    status: "pending",
                    detail: "Invalid Token",
                });
            }
        }
        catch (error) {
            res.status(404);
            return res.json({
                status: "error",
                detail: 'Invaild Verification Check Request'
            });
        }
    }
};
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('local')),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.UseGuards)(login_guard_1.LoginAuthGuard),
    (0, common_1.Post)('otp/get/login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [phone_number_dto_1.PhoneNumberDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendLoginOtp", null);
__decorate([
    (0, common_1.Post)('otp/get/signup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [phone_number_dto_1.PhoneNumberDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendSignupOtp", null);
__decorate([
    (0, common_1.UseGuards)(login_guard_1.LoginAuthGuard),
    (0, common_1.Post)('otp/check/login'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, otp_dto_1.OtpDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "checkLoginOtp", null);
__decorate([
    (0, common_1.Post)('otp/check/signup'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, otp_dto_1.OtpDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "checkSignupOtp", null);
AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        jwt_1.JwtService])
], AuthController);
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map