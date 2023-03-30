"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const signup_module_1 = require("../signup/signup.module");
const chat_controller_1 = require("./chat.controller");
const chat_service_1 = require("./chat.service");
const typeorm_1 = require("@nestjs/typeorm");
const chat_room_entity_1 = require("./entity/chat-room.entity");
const user_entity_1 = require("../user/entity/user.entity");
const auth_module_1 = require("../auth/auth.module");
const jwt_1 = require("@nestjs/jwt");
const typeorm_2 = require("typeorm");
const user_module_1 = require("../user/user.module");
const ws_module_1 = require("../ws/ws.module");
let ChatModule = class ChatModule {
};
ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            signup_module_1.SignupModule,
            user_module_1.UserModule,
            auth_module_1.AuthModule,
            (0, common_1.forwardRef)(() => ws_module_1.WsModule),
            typeorm_1.TypeOrmModule.forFeature([chat_room_entity_1.ChatRoom, user_entity_1.User]),
        ],
        providers: [chat_service_1.ChatService, jwt_1.JwtService, typeorm_2.Repository],
        controllers: [chat_controller_1.ChatController],
        exports: [chat_service_1.ChatService],
    })
], ChatModule);
exports.ChatModule = ChatModule;
//# sourceMappingURL=chat.module.js.map