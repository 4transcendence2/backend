export declare class ChatRoom {
    room_id: number;
    status: string;
    password: string;
    title: string;
    owner: string;
    admin_list: string[];
    user_list: string[];
    mute_list: string[];
    ban_list: string[];
    validatePassword(): void;
}
