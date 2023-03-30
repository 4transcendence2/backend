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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const user_service_1 = require("../user/user.service");
const user_entity_1 = require("../user/entity/user.entity");
const bcrypt = require("bcrypt");
const login_service_1 = require("../login/login.service");
const client = require('twilio')('AC9409078cc01ffa3c66be5844f8bd145a', '53e28dea1e42e5fd0e5a143fbc8352f7');
let AuthService = class AuthService {
    constructor(userService, loginService) {
        this.userService = userService;
        this.loginService = loginService;
    }
    async validateUser(id, password) {
        const user = await this.userService.findOne(id);
        if (user && await bcrypt.compare(password, user.password)) {
            return user;
        }
        return null;
    }
    async login(user) {
        return {
            status: 'approved',
            access_token: await this.loginService.login(user),
        };
    }
    async sendOtp(phoneNumber) {
        client.verify.v2.services('VA81bb240d9cd5af57e1d1f89659a220c0')
            .verifications
            .create({ to: '+82' + phoneNumber.substring(1), channel: 'sms' })
            .catch(error => console.log(error));
    }
    async checkOtp(otp) {
        try {
            const result = await client.verify.v2.services('VA81bb240d9cd5af57e1d1f89659a220c0')
                .verificationChecks
                .create({ to: '+821021145537', code: otp });
            return result;
        }
        catch (error) {
            throw new Error('Verification failed');
        }
    }
};
AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_1.UserService,
        login_service_1.LoginService])
], AuthService);
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map