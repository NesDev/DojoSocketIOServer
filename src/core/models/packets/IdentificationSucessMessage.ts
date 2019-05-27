import {UserInformations} from "@server/src/core/user/userInformations";

export class IdentificationSucessMessage {
    _messageType = 'IdentificationSuccessMessage';
    userInformations?: UserInformations;
}
