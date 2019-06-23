import {Dispatcher} from '@server/src/core/utils/events/dispatcher';
import {User} from '@server/src/core/user';
import SocketManager from '@server/src/core/utils/socket';
import * as SocketIO from 'socket.io';
import {IdentificationRequestMessage} from '@server/src/core/models/packets/IdentificationRequestMessage';
import {IdentificationSucessMessage} from '@server/src/core/models/packets/IdentificationSucessMessage';
import {IdentificationFailedMessage} from '@server/src/core/models/packets/IdentificationFailedMessage';
import {UserInformations} from '@server/src/core/models/types/userInformations';
import {CreateAccountRequestMessage} from '@server/src/core/models/packets/CreateAccountRequestMessage';
import {IdentificationFailedReasonEnum} from '@server/src/core/models/enums/IdentificationFailedReasonEnum';
import {IdentificationTypeEnum} from '@server/src/core/models/enums/IdentificationTypeEnum';
import {CreateAccountErrorMessage} from "@server/src/core/models/packets/CreateAccountErrorMessage";
import {CreateAccountSuccesMessage} from "@server/src/core/models/packets/CreateAccountSuccesMessage";

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
            log(`Tentative de connexion.. IP : ` + socket.getIp() + ' clients : ' + Object.keys(this.socketServer.sockets.sockets).length);
            const wrapper = socket.wrap();
            wrapper.on('packet::IdentificationRequestMessage', async (packet: IdentificationRequestMessage) => {
                log(`Identification reçu : ` + JSON.stringify(packet));
                switch (packet.type) {
                    case IdentificationTypeEnum.CLIENT:
                        const userInformations = this.usersInformations.find((elt) => elt.login === packet.login);
                        if (userInformations) {
                            if (userInformations.password === packet.password) {
                                const user = new User(this, socket, userInformations)
                                this.users.push(user);
                                this.sendIdentificationSucessMessage(socket, userInformations);
                                user.init();
                            } else {
                                this.sendIdentificationFailedMessage(socket, IdentificationFailedReasonEnum.WRONG_PASSWORD);
                            }
                        } else {
                            this.sendIdentificationFailedMessage(socket, IdentificationFailedReasonEnum.UNKNOW_USER);
                        }
                        break;
                }
            });
            wrapper.on('packet::CreateAccountRequestMessage', async (packet: CreateAccountRequestMessage) => {
                if (this.usersInformations.findIndex((elt) => elt.login === packet.login) === -1) {
                    const userInformations = new UserInformations(packet.login, packet.password);
                    this.addUser(userInformations);
                    const user = new User(this, socket, userInformations);
                    this.users.push(user);
                    this.sendIdentificationSucessMessage(socket, userInformations);
                    socket.send("CreateAccountSuccesMessage", {userInformations: userInformations} as CreateAccountSuccesMessage);
                    user.init();
                } else {
                    socket.send("CreateAccountErrorMessage", {reason: "Login exist !"} as CreateAccountErrorMessage);
                }
            });
            wrapper.on('socket::disconnected', () => {
                log("Deconnection d'un socket, clients : " + Object.keys(this.socketServer.sockets.sockets).length);
                wrapper.done();
            });
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
    }

    private addUser(userInformations: UserInformations) {
        this.usersInformations.push(userInformations);
    }
}
