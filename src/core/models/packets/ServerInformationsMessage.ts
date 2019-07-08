import {UserInformations} from "@server/src/core/models/types/userInformations";
import { CustomLog } from '@server/src/core/models/types/custom-log';

export class ServerInformationsMessage {
    users: UserInformations[];
    logs: CustomLog[];
    colorTchat: string;
}
