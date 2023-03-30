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
exports.WsGateWay = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const constants_1 = require("../auth/constants");
const ws_service_1 = require("./ws.service");
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../user/entity/user.entity");
const jwt = require("jsonwebtoken");
const chat_room_entity_1 = require("../chat/entity/chat-room.entity");
const typeorm_2 = require("@nestjs/typeorm");
let WsGateWay = class WsGateWay {
    constructor(wsService, usersRepository, chatRoomRepository) {
        this.wsService = wsService;
        this.usersRepository = usersRepository;
        this.chatRoomRepository = chatRoomRepository;
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.headers.authorization.split(' ')[1];
            const decodedToken = jwt.verify(token, constants_1.jwtConstants.secret);
            await this.wsService.addUser(decodedToken['username'], client.id);
            console.log(`Client with IP ${client.id} is connected.`);
        }
        catch (error) {
            client.emit('error', {
                status: 'error',
                detail: 'Invalid Token.'
            });
        }
    }
    async handleDisconnect(client) {
        this.wsService.deleteUser(client.id);
        console.log(`Client with IP ${client.id} is disconnected.`);
    }
    async joinChatRoom(client, body) {
        const room_id = body.room_id;
        const username = await this.wsService.findUserByClientId(client.id);
        const chatRoom = await this.chatRoomRepository.findOneBy({ room_id });
        const user = await this.usersRepository.findOneBy({ username });
        if (body.room_id === undefined) {
            client.emit('notice', {
                status: 'notice',
                content: '존재하지 않는 채팅방입니다.',
                detail: '`room_id` property is missing.'
            });
            return;
        }
        if (chatRoom === null) {
            client.emit('notice', {
                status: 'notice',
                content: '존재하지 않는 채팅방입니다.',
                detail: 'nonexistent room_id.',
            });
            return;
        }
        try {
            if (chatRoom.ban_list.find(element => element === username)) {
                client.emit('notice', {
                    status: 'notice',
                    content: '입장금지 목록에 등록되어 입장이 불가능합니다.',
                    detail: 'This user is on ban list.'
                });
                return;
            }
        }
        catch (_a) { }
        if (chatRoom.status === 'protected') {
            if (body.password === undefined) {
                client.emit('notice', {
                    status: 'notice',
                    content: '비밀번호를 입력해주세요.',
                    detail: '`password` property is missing. '
                });
                return;
            }
            if (chatRoom.password !== body.password) {
                client.emit('notice', {
                    status: 'notice',
                    content: '잘못된 비밀번호입니다.',
                    detail: 'Invalid password.',
                });
                return;
            }
        }
        if (chatRoom.user_list === null) {
            chatRoom.user_list = [username];
        }
        else {
            if (chatRoom.user_list.find(element => element === username) === undefined)
                chatRoom.user_list.push(username);
        }
        await this.chatRoomRepository.save(chatRoom);
        if (user.chat_room_list === null) {
            user.chat_room_list = [parseInt(room_id)];
        }
        else {
            if (user.chat_room_list.find(element => element === room_id) === undefined) {
                user.chat_room_list.push(room_id);
                this.server.to('room' + room_id).emit('chat', `${username}님이 채팅방에 입장하셨습니다.`);
                client.join('room' + room_id);
            }
        }
        await this.usersRepository.save(user);
    }
    async exitChatRoom(client, body) {
        if (body.room_id === undefined) {
            client.emit('notice', {
                status: 'notice',
                content: '존재하지 않는 채팅방입니다.',
                detail: '`room_id` property is missing.'
            });
            return;
        }
        const room_id = body.room_id;
        const chatRoom = await this.chatRoomRepository.findOneBy({ room_id });
        if (chatRoom === null) {
            client.emit('notice', {
                status: 'notice',
                content: '존재하지 않는 채팅방입니다.',
                detail: 'nonexistent room_id.',
            });
            return;
        }
        const username = await this.wsService.findUserByClientId(client.id);
        let index = chatRoom.user_list.findIndex(element => element === username);
        if (index !== -1)
            chatRoom.user_list.splice(index, 1);
        else {
            client.emit('error', {
                status: 'error',
                detail: `This user is not a member of chat room id ${room_id}`,
            });
            return;
        }
        try {
            index = chatRoom.admin_list.findIndex(element => element === username);
            if (index !== -1)
                chatRoom.admin_list.splice(index, 1);
        }
        catch (_a) { }
        const user = await this.usersRepository.findOneBy({ username });
        index = user.chat_room_list.findIndex(element => element === room_id);
        if (index !== -1)
            user.chat_room_list.splice(index, 1);
        else {
            client.emit('error', {
                status: 'error',
                detail: `This user is not a member of chat room id ${room_id}`,
            });
            return;
        }
        client.leave('room' + room_id);
        this.server.to('room' + room_id).emit('chat', `${username}님이 채팅방에서 나가셨습니다.`);
        await this.usersRepository.save(user);
        await this.chatRoomRepository.save(chatRoom);
        if (chatRoom.user_list.length === 0) {
            await this.chatRoomRepository.delete({ room_id: room_id });
            return;
        }
        if (chatRoom.owner === username) {
            chatRoom.owner = chatRoom.user_list[0];
            index = chatRoom.admin_list.findIndex(element => element === chatRoom.user_list[0]);
            if (index !== -1)
                chatRoom.admin_list.splice(index, 1);
            this.server.to('room' + room_id).emit('chat', `${chatRoom.owner}님이 새로운 소유자가 되었습니다.`);
        }
        await this.chatRoomRepository.save(chatRoom);
    }
    async chat(client, body) {
    }
    async kickUser(client, body) {
    }
    async banUser(client, body) {
    }
    async blockUser(client, body) {
    }
};
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], WsGateWay.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinChatRoom'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], WsGateWay.prototype, "joinChatRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('exitChatRoom'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], WsGateWay.prototype, "exitChatRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], WsGateWay.prototype, "chat", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('kickUser'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], WsGateWay.prototype, "kickUser", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('banUser'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], WsGateWay.prototype, "banUser", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('block'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], WsGateWay.prototype, "blockUser", null);
WsGateWay = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
    }),
    __param(1, (0, typeorm_2.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_2.InjectRepository)(chat_room_entity_1.ChatRoom)),
    __metadata("design:paramtypes", [ws_service_1.WsService,
        typeorm_1.Repository,
        typeorm_1.Repository])
], WsGateWay);
exports.WsGateWay = WsGateWay;
//# sourceMappingURL=ws.gateway.js.map