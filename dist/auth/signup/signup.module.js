"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignupModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const auth_module_1 = require("../auth.module");
const constants_1 = require("../constants");
const signup_service_1 = require("./signup.service");
const signup_strategy_1 = require("./signup.strategy");
let SignupModule = class SignupModule {
};
SignupModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule,
            (0, common_1.forwardRef)(() => auth_module_1.AuthModule),
            jwt_1.JwtModule.register({
                secret: constants_1.jwtConstants.signupSecret,
                signOptions: { expiresIn: '120h' },
            })
        ],
        providers: [signup_service_1.SignupService, signup_strategy_1.SignupStrategy],
        exports: [signup_service_1.SignupService]
    })
], SignupModule);
exports.SignupModule = SignupModule;
//# sourceMappingURL=signup.module.js.map