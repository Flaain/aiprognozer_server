import { UserDocument, WebAppUser } from 'src/modules/user/types/types';

export type InitDataInRequest = Pick<WebAppInitData, 'user' | 'hash' | 'auth_date' | 'query_id'> & {
    data_check_string: string;
};

export interface WebAppChat {
    id: number;
    type: 'group' | 'supergroup' | 'channel';
    title: string;
    username?: string;
    photo_url?: string;
}

export interface WebAppInitData {
    query_id?: string;
    user?: WebAppUser;
    receiver?: WebAppUser;
    chat?: WebAppChat;
    chat_type?: 'sender' | 'private' | WebAppChat['type'];
    chat_instance?: number;
    start_params?: string;
    can_send_after?: number;
    auth_date: Date;
    hash: string;
    signature: string;
}

export interface RequestWithInitData extends Request {
    init_data: InitDataInRequest;
}

export interface RequestWithInitDataAndUser extends RequestWithInitData {
    user: UserDocument;
}