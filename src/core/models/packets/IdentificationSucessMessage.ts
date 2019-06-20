import {UserInformations} from "@server/src/core/models/types/userInformations";

export class IdentificationSucessMessage {
    _messageType = 'IdentificationSuccessMessage';
    userInformations?: UserInformations;
}
