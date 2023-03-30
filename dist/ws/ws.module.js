"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("../auth/auth.module");
const chat_module_1 = require("../chat/chat.module");
const game_module_1 = require("../game/game.module");
const signup_module_1 = require("../signup/signup.module");
const ws_gateway_1 = require("./ws.gateway");
const ws_service_1 = require("./ws.service");
const user_entity_1 = require("../user/entity/user.entity");
const typeorm_2 = require("typeorm");
const chat_room_entity_1 = require("../chat/entity/chat-room.entity");
const user_module_1 = require("../user/user.module");
let WsModule = class WsModule {
};
WsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            signup_module_1.SignupModule,
            auth_module_1.AuthModule,
            game_module_1.GameModule,
            user_module_1.UserModule,
            (0, common_1.forwardRef)(() => chat_module_1.ChatModule),
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, chat_room_entity_1.ChatRoom]),
        ],
        providers: [ws_gateway_1.WsGateWay, ws_service_1.WsService, typeorm_2.Repository],
        exports: [ws_gateway_1.WsGateWay, ws_service_1.WsService],
    })
], WsModule);
exports.WsModule = WsModule;
//# sourceMappingURL=ws.module.js.map