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
exports.ChatRoom = void 0;
const typeorm_1 = require("typeorm");
const chat_room_status_1 = require("../chat-room.status");
let ChatRoom = class ChatRoom {
    validatePassword() {
        if (this.status === 'protected' && (this.password === null || this.password === undefined)) {
            throw new Error('Password is required for protected rooms.');
        }
        if ((this.status === 'public' || this.status === 'private') && (this.password !== undefined && this.password !== null)) {
            throw new Error('Password is not required for public or private rooms.');
        }
    }
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ChatRoom.prototype, "room_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: false,
        enum: chat_room_status_1.RoomStatus
    }),
    __metadata("design:type", String)
], ChatRoom.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
    }),
    __metadata("design:type", String)
], ChatRoom.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: false,
    }),
    __metadata("design:type", String)
], ChatRoom.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: false,
    }),
    __metadata("design:type", String)
], ChatRoom.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "text",
        array: true,
        nullable: true,
    }),
    __metadata("design:type", Array)
], ChatRoom.prototype, "admin_list", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        array: true,
        nullable: true,
    }),
    __metadata("design:type", Array)
], ChatRoom.prototype, "user_list", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        array: true,
        nullable: true,
    }),
    __metadata("design:type", Array)
], ChatRoom.prototype, "mute_list", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        array: true,
        nullable: true,
    }),
    __metadata("design:type", Array)
], ChatRoom.prototype, "ban_list", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ChatRoom.prototype, "validatePassword", null);
ChatRoom = __decorate([
    (0, typeorm_1.Entity)('chat_room')
], ChatRoom);
exports.ChatRoom = ChatRoom;
//# sourceMappingURL=chat-room.entity.js.map