import {ChatAbstractServerMessage} from './ChatAbstractServerMessage';

export class ChatServerMessage extends ChatAbstractServerMessage {
    senderId?: number;
    senderName?: string;
    senderAccountId?: number;
}
