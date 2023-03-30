"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const local_strategy_1 = require("./local.strategy");
const user_module_1 = require("../user/user.module");
const passport_1 = require("@nestjs/passport");
const auth_controller_1 = require("./auth.controller");
const jwt_1 = require("@nestjs/jwt");
const constants_1 = require("./constants");
const nestjs_twilio_1 = require("nestjs-twilio");
const signup_module_1 = require("../signup/signup.module");
const login_module_1 = require("../login/login.module");
const jwt_strategy_1 = require("./jwt.strategy");
const login_strategy_1 = require("../login/login.strategy");
const signup_strategy_1 = require("../signup/signup.strategy");
let AuthModule = class AuthModule {
};
AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            (0, common_1.forwardRef)(() => user_module_1.UserModule),
            signup_module_1.SignupModule,
            login_module_1.LoginModule,
            passport_1.PassportModule,
            jwt_1.JwtModule.register({
                secret: constants_1.jwtConstants.secret,
                signOptions: { expiresIn: '2d' },
            }),
            nestjs_twilio_1.TwilioModule.forRoot({
                accountSid: "AC9409078cc01ffa3c66be5844f8bd145a",
                authToken: "53e28dea1e42e5fd0e5a143fbc8352f7"
            }),
        ],
        providers: [auth_service_1.AuthService, local_strategy_1.LocalStrategy, jwt_strategy_1.JwtStrategy],
        controllers: [auth_controller_1.AuthController],
        exports: [auth_service_1.AuthService]
    })
], AuthModule);
exports.AuthModule = AuthModule;
//# sourceMappingURL=auth.module.js.map