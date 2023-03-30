"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsJwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../auth/constants");
const jwt = require("jsonwebtoken");
let WsJwtAuthGuard = class WsJwtAuthGuard {
    canActivate(context) {
        const client = context.switchToWs().getClient();
        const authorizationHeader = client.handshake.headers.authorization;
        console.log(authorizationHeader);
        if (!authorizationHeader || !authorizationHeader.startsWith('Bearer')) {
            return false;
        }
        const token = authorizationHeader.split(' ')[1];
        try {
            const payload = jwt.verify(token, constants_1.jwtConstants.secret);
            console.log(payload);
        }
        catch (error) {
            console.log(error);
            return false;
        }
    }
};
WsJwtAuthGuard = __decorate([
    (0, common_1.Injectable)()
], WsJwtAuthGuard);
exports.WsJwtAuthGuard = WsJwtAuthGuard;
//# sourceMappingURL=chat.jwtguard.js.map