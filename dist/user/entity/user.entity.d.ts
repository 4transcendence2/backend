export declare class User {
    unique_id: number;
    status: number;
    rating: number;
    win: number;
    lose: number;
    friend_list: number[];
    chat_room_list: number[];
    block_list: string[];
    game_history_id: number;
    current_game_id: number;
    username: string;
    password: string;
    intra_id: string;
    nickname: string;
    avatar_path: string;
    phone_number: string;
    chat_socket_ip: string;
    game_socket_ip: string;
}
