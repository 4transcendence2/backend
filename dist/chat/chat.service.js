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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const chat_room_entity_1 = require("./entity/chat-room.entity");
const user_entity_1 = require("../user/entity/user.entity");
const ws_gateway_1 = require("../ws/ws.gateway");
const ws_service_1 = require("../ws/ws.service");
let ChatService = class ChatService {
    constructor(chatRoomRepository, usersRepository, wsGateway, wsService) {
        this.chatRoomRepository = chatRoomRepository;
        this.usersRepository = usersRepository;
        this.wsGateway = wsGateway;
        this.wsService = wsService;
    }
    async createRoom(roomInfo, username) {
        const newRoom = this.chatRoomRepository.create({
            status: roomInfo.status,
            title: roomInfo.title,
            owner: username,
            password: roomInfo.password,
        });
        try {
            await this.chatRoomRepository.insert(newRoom);
            const room_id = newRoom.room_id;
            const user = await this.usersRepository.findOneBy({ username });
            const chatRoom = await this.chatRoomRepository.findOneBy({ room_id });
            if (chatRoom.user_list === null) {
                chatRoom.user_list = [username];
            }
            else {
                if (chatRoom.user_list.find(element => element === username) === undefined)
                    chatRoom.user_list.push(username);
            }
            await this.chatRoomRepository.save(chatRoom);
            if (user.chat_room_list === null) {
                user.chat_room_list = [room_id];
            }
            else {
                if (user.chat_room_list.find(element => element === room_id) === undefined)
                    user.chat_room_list.push(room_id);
            }
            await this.usersRepository.save(user);
            const server = this.wsGateway.server;
            const clientId = await this.wsService.findClientIdByUsername(username);
            const client = server.sockets.sockets.get(clientId);
            client.join('room' + room_id);
        }
        catch (error) {
            console.log(error);
            const detail = newRoom.status === 'protected' ? 'Password is required for protected room.' : 'Password is not required for public or private room.';
            return {
                status: "error",
                detail: detail,
            };
        }
        return {
            status: "approved",
            detail: "Chat room is created.",
        };
    }
};
ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_room_entity_1.ChatRoom)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        ws_gateway_1.WsGateWay,
        ws_service_1.WsService])
], ChatService);
exports.ChatService = ChatService;
//# sourceMappingURL=chat.service.js.map