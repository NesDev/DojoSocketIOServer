import {IdentificationTypeEnum} from "@server/src/core/models/enums/IdentificationTypeEnum";

export class IdentificationRequestMessage {
    _messageType = 'IdentificationRequestMessage';
    login: string;
    password: string;
    id: string;
    type: IdentificationTypeEnum;
}