import {Dispatcher} from "@server/src/core/utils/events/dispatcher";
import {User} from "@server/src/core/user";
import SocketManager from "@server/src/core/utils/socket";
import * as SocketIO from 'socket.io';
import {IdentificationRequestMessage} from "@server/src/core/models/packets/IdentificationRequestMessage";
import {IdentificationSucessMessage} from "@server/src/core/models/packets/IdentificationSucessMessage";
import {IdentificationFailedMessage} from "@server/src/core/models/packets/IdentificationFailedMessage";
import { UserInformations} from "@server/src/core/user/userInformations";
import {CreateUserRequestMessage} from "@server/src/core/models/packets/CreateUserRequestMessage";
import {IdentificationFailedReasonEnum} from "@server/src/core/models/enums/IdentificationFailedReasonEnum";

const log = require('debug')('server');

export class Server extends Dispatcher {
    public socketServer: SocketIO.Server = SocketIO();
    public users: User[] = [];
    public usersInformations: UserInformations[] = [];

    constructor() {
        super();
    }

    public init(): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            this.initServer();
            return resolve(true);
        });
    }

    private initServer() {
        log(`Waitting users`);
        this.socketServer.on('connection', data => {
            const socket = new SocketManager(data);
            log(`Tentative de connexion.. IP : ` + socket.getIp());
            const wrapper = socket.wrap();
            wrapper.on('packet::IdentificationRequestMessage', async (packet: IdentificationRequestMessage) => {
                log(`Identification reçu : ` + JSON.stringify(packet));
                const userInformations = this.usersInformations.find((elt) => elt.login === packet.login);
                if (userInformations) {
                    if (userInformations.password === packet.password) {
                        const userManager = new User(this, socket, userInformations);
                        this.users.push(userManager);
                        this.sendIdentificationSucessMessage(socket,userInformations)
                    } else {
                        this.sendIdentificationFailedMessage(socket, IdentificationFailedReasonEnum.WRONG_PASSWORD);
                    }
                } else {
                    this.sendIdentificationFailedMessage(socket, IdentificationFailedReasonEnum.UNKNOW_USER);
                }
                wrapper.done();
            });
            wrapper.on("packet::CreateUserRequestMessage", async (packet: CreateUserRequestMessage) => {

            })
        });
        this.socketServer.listen(8001);
    }





    private sendIdentificationSucessMessage(socket: SocketManager, userInformations: UserInformations) {
        log('IdentificationSucessMessage : ', userInformations);
        socket.send('IdentificationSucessMessage', {
            userInformations
        } as IdentificationSucessMessage);
    }

    private sendIdentificationFailedMessage(socket: SocketManager, reason: IdentificationFailedReasonEnum) {
        log('IdentificationFailedMessage : ' + reason);
        socket.send('IdentificationFailedMessage', {
            reason: reason
        } as IdentificationFailedMessage);
        socket.disconnect('IdentificationFailedMessage : ' + reason);
    }
}
