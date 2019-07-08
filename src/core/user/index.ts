import { Server } from '@server/src/core';
import SocketManager from '@server/src/core/utils/socket';
import { Dispatcher } from '@server/src/core/utils/events/dispatcher';
import { UserInformations } from '@server/src/core/models/types/userInformations';
import { EventWrapper } from '@server/src/core/utils/events/eventWrapper';
import { UserDisconnectedMessage } from '@server/src/core/models/packets/UserDisconnectedMessage';
import { ServerInformationsMessage } from '@server/src/core/models/packets/ServerInformationsMessage';
import { UserConnectedMessage } from '@server/src/core/models/packets/UserConnectedMessage';
import { CommandRequestMessage } from '@server/src/core/models/packets/CommandRequestMessage';
import { NewLogMessage } from '@server/src/core/models/packets/newLogMessage';
import { CustomLog } from '@server/src/core/models/types/custom-log';
import { CustomLogTypeEnum } from '@server/src/core/models/types/custom-log-type-enum.enum';
import { ChangeColorRequestMessage } from '@server/src/core/models/packets/ChangeColorRequestMessage';
import { UserInformationsUpdated } from '@server/src/core/models/packets/UserInformationsUpdated';
import { ChangeSizeRequestMessage } from '@server/src/core/models/packets/ChangeSizeRequestMessage';
import { ChangeWeightRequestMessage } from '@server/src/core/models/packets/ChangeWeightRequestMessage';
import { LogsUpdated } from '@server/src/core/models/packets/LogsUpdated';
import { BackgroundChangeRequestMessage } from '@server/src/core/models/packets/BackgroundChangeRequestMessage';
import { Utils } from '@server/src/core/utils';
import { StepCalcMessage } from '@server/src/core/models/packets/StepCalcMessage';
import { StepCalcResponseRequestMessage } from '@server/src/core/models/packets/StepCalcResponseRequestMessage';
import { StepCalcErrorMessage } from '@server/src/core/models/packets/StepCalcErrorMessage';
import { BackgroundChangedMessage } from '@server/src/core/models/packets/BackgroundChangedMessage';
import moment = require('@server/node_modules/moment');

/**
 * Classe permettant de gérer toute les actions/informations d'un utilisateur connecté
 */
export class User extends Dispatcher {
    // Les informations sur l'utilisateur
    public userInformations: UserInformations;

    public infos = 'Voici quelque commandes intéressantes : <br/><b>' +
        '- BackgroundChangeRequestMessage {newColor: true/false} <br/>' +
        '- ChangeColorRequestMessage {newColor: couleur} <br/>' +
        '- ChangeWeightRequestMessage {newWeight: weight} <br/>' +
        '- ChangeSizeRequestMessage {newSize: size} <br/>' +
        '- ChangeMyRoleByAdmin {becomAnAdmin: true/false} <br/>' +
        '- KickUserRequestMessage {login: login}<br/></b>';
    // L'accés aux données du server
    private server: Server;
    // Le socket entre ce model utilisateur server et celui client
    private socket: SocketManager;
    // L'ecouteur Utilisateur
    private wrapperUser: EventWrapper;
    // L'ecouteur Server
    private wrapperServer: EventWrapper;

    constructor(server: Server, socket: SocketManager, userInformations: UserInformations) {
        super();
        this.server = server;
        this.userInformations = userInformations;
        this.socket = socket;
        this.socket.dispatchers.push(this);
        this.monitorPacketsUser();
        this.monitorPacketsServer();
    }

    init() {
        this.sendServerInformations();
        this.server.emit('event::UserConnectedMessage', {
            userInformations: this.userInformations
        } as UserConnectedMessage);
    }

    public sendServerInformations() {
        const infos = new ServerInformationsMessage();
        infos.users = [];
        infos.logs = this.server.logs;
        infos.colorTchat = this.server.colorTchat;
        for (const user of this.server.users) {
            const userInfos = this.server.usersInformations.find((elt) => elt.login === user.userInformations.login);
            if (userInfos) {
                infos.users.push(userInfos);
            }
        }
        this.socket.send('ServerInformationsMessage', infos);
    }

    /**
     * Ecoute tous les evenements en rapport avec l'user même
     */
    private monitorPacketsUser() {
        this.wrapperUser = this.wrap();
        this.wrapperUser.on('packet::CommandRequestMessage', (packet: CommandRequestMessage) => {
            if (!packet.cmd || packet.cmd === '') return false;
            if (packet.cmd.indexOf('/cleanDojo') !== -1) {
                this.server.logs = [];
                this.server.saveDatas();
                this.server.emit('event::LogsUpdated', {
                    logs: this.server.logs
                } as LogsUpdated);
            } else if (packet.cmd.indexOf('/infos') !== -1) {
                const log = new CustomLog(CustomLogTypeEnum.NORMAL, moment(), 'SERVER', this.infos);
                log.color = 'green';
                log.size = 15;
                this.socket.send('NewLogMessage', {
                    log
                });
            } else if (packet.cmd.indexOf('/w') !== -1) {
                const tabs = packet.cmd.split(' ');
                const userName = tabs[1];
                const user = this.server.users.find((elt) => elt.userInformations.name === userName);
                const log = new CustomLog(CustomLogTypeEnum.NORMAL, moment(), 'SERVER', packet.cmd);
                log.color = 'green';
                log.size = 15;
                if (user) {
                    user.socket.send('NewLogMessage', {
                        log
                    });
                } else {
                    log.message = 'User not exist';
                    this.socket.send('NewLogMessage', {
                        log
                    });
                }

            } else {
                const log = new CustomLog(CustomLogTypeEnum.NORMAL, moment(), this.userInformations.name, packet.cmd);
                log.color = this.userInformations.color;
                log.size = this.userInformations.size;
                this.server.emit('event::NewLogMessage', {
                    log
                } as NewLogMessage);
            }
        });
        this.wrapperUser.on('packet::ChangeColorRequestMessage', (packet: ChangeColorRequestMessage) => {
            this.userInformations.color = packet.newColor;
            const user = this.server.usersInformations.find((elt) => elt.login === this.userInformations.login);
            if (user) {
                user.color = packet.newColor;
            }
            this.server.emit('event::UserInformationsUpdated', {
                userInformations: user
            } as UserInformationsUpdated);
        });
        this.wrapperUser.on('packet::ChangeMyRoleByAdmin', (packet: any) => {
            const cmd = 'L\'utilisateur ' + this.userInformations.name + ' a voulu devenir admin, mais il n\'est pas digne donc il reste simple utilisateur';
            const log = new CustomLog(CustomLogTypeEnum.NORMAL, moment(), this.userInformations.name, cmd);
            log.color = 'red';
            log.size = 15;
            this.server.emit('event::NewLogMessage', {
                log
            } as NewLogMessage);
        });
        this.wrapperUser.on('packet::KickUserRequestMessage', (packet: any) => {
            const cmd = this.userInformations.name + ' a voulu kick l\'utilisateur ' + packet.login + ', pas cool de sa part pour la peine je le vire lui';
            const log = new CustomLog(CustomLogTypeEnum.NORMAL, moment(), this.userInformations.name, cmd);
            log.color = 'red';
            log.size = 15;
            this.server.emit('event::NewLogMessage', {
                log
            } as NewLogMessage);
            const log2 = new CustomLog(CustomLogTypeEnum.NORMAL, moment(), 'SERVER', 'Vous avez etait kick par le serveur');
            log2.color = 'green';
            log2.size = 15;
            this.socket.send('NewLogMessage', {
                log: log2
            });
            this.socket.disconnect('Kick By Server');
        });
        this.wrapperUser.on('packet::ChangeSizeRequestMessage', (packet: ChangeSizeRequestMessage) => {
            this.userInformations.size = packet.newSize;
            const user = this.server.usersInformations.find((elt) => elt.login === this.userInformations.login);
            if (user) {
                user.size = packet.newSize;
            }
            this.server.emit('event::UserInformationsUpdated', {
                userInformations: user
            } as UserInformationsUpdated);
        });
        this.wrapperUser.on('packet::ChangeWeightRequestMessage', (packet: ChangeWeightRequestMessage) => {
            this.userInformations.weight = packet.newWeight;
            if (packet.newWeight !== null || packet.newWeight !== undefined) {
                const user = this.server.usersInformations.find((elt) => elt.login === this.userInformations.login);
                if (user) {
                    user.weight = packet.newWeight;
                    this.socket.send('ChangeWeightSuccessMessage');
                    this.server.emit('event::UserInformationsUpdated', {
                        userInformations: user
                    } as UserInformationsUpdated);
                } else this.socket.send('ChangeWeightErrorMessage', { reason: 'User ' + this.userInformations.login + ' not exist' });
            } else this.socket.send('ChangeWeightErrorMessage', { reason: 'you need to send data : {newWeight: value}' });
        });
        // Mon user vient de se deconnecter
        this.wrapperUser.on('socket::disconnected', () => {
            // J'arrete d'ecouter les informations du server
            this.wrapperServer.done();
            // J'arrete d'ecouter les informations de l'user
            this.wrapperUser.done();
            // Je me supprime des utilisateurs connecte
            this.server.users = this.server.users.filter((elt) => elt !== this);
            // Je deploi l'informations à tous le monde
            this.server.emit('event::UserDisconnectedMessage', {
                login: this.userInformations.login,
                reason: ''
            } as UserDisconnectedMessage);
        });
        this.wrapperUser.on('packet::BackgroundChangeRequestMessage', async (packet: BackgroundChangeRequestMessage) => {
            const msg = '<b>Pour exécuter BackgroundChangeRequestMessage le serveur vous envois un petit test à résoudre rapidement, pour lui répondre : => <br/>' +
                'StepCalcResponseRequestMessage {reponse: votre réponse, id: l\'identificant du calcul}<br/> ' +
                'Toutes les fonctions ne demandent pas forcément un test à résoudre ;)<b/>';
            const log = new CustomLog(CustomLogTypeEnum.NORMAL, moment(), 'SERVER', msg);
            log.color = 'green';
            log.size = 17;
            this.socket.send('NewLogMessage', {
                log
            });

            for (let i = 0; i < 5; i++) {
                const calc = await this.testCalcUser();
                if (!calc.response) {
                    return false;
                }
            }
            this.server.emit('event::BackgroundChangedMessage', {
                newColor: packet.newColor
            } as BackgroundChangedMessage);
        });
    }

    /**
     * Ecoute tous les evenements en rapport avec le server
     */
    private monitorPacketsServer() {
        this.wrapperServer = this.server.wrap();
        this.wrapperServer.on('event::UserDisconnectedMessage', (event: UserDisconnectedMessage) => {
            this.socket.send('UserDisconnectedMessage', event);
        });
        this.wrapperServer.on('event::UserConnectedMessage', (event: UserDisconnectedMessage) => {
            if (event.login !== this.userInformations.login) {
                this.socket.send('UserConnectedMessage', event);
            }
        });
        this.wrapperServer.on('event::NewLogMessage', (event: NewLogMessage) => {
            this.socket.send('NewLogMessage', event);
        });
        this.wrapperServer.on('event::UserInformationsUpdated', (event: UserInformationsUpdated) => {
            this.socket.send('UserInformationsUpdated', event);
        });
        this.wrapperServer.on('event::LogsUpdated', (event: LogsUpdated) => {
            this.socket.send('LogsUpdated', event);
        });
        this.wrapperServer.on('event::BackgroundChangedMessage', (event: LogsUpdated) => {
            this.socket.send('BackgroundChangedMessage', event);
        });
    }


    private testCalcUser(): Promise<{ response: boolean, reason: string }> {
        return new Promise<{ response: boolean, reason: string }>((resolve, reject) => {
            const id = Utils.generateId();
            const op1 = Math.random() * 1000;
            const op2 = Math.random() * 1000;
            const operand: string = '+';
            const delay = 3000;
            // J'ecoute les packets
            const wrapper = this.wrap();
            // Timeout
            const timeout = setTimeout(() => {
                this.socket.send('StepCalcErrorMessage', {
                    reason: 'TIMEOUT, Try Again send function request'
                } as StepCalcErrorMessage);
                wrapper.done();
                return resolve({ response: false, reason: 'TIMEOUT' });
            }, delay);
            // Je reçois une réponse
            wrapper.on('packet::StepCalcResponseRequestMessage', (packet: StepCalcResponseRequestMessage) => {
                if (packet.id === id) {
                    clearTimeout(timeout);
                    wrapper.done();
                    const goodResult = op1 + op2;
                    if (goodResult === packet.response) {
                        return resolve({ response: true, reason: 'OK' });
                    } else {
                        this.socket.send('StepCalcErrorMessage', {
                            reason: 'Wrong result, the good result : ' + (op1 + op2)
                        } as StepCalcErrorMessage);
                        return resolve({ response: false, reason: 'Wrong result' });
                    }
                }
            });
            // J'envoi le calcul
            this.socket.send('StepCalcMessage', {
                id: id,
                op1,
                op2,
                operand
            } as StepCalcMessage);
        });
    }
}
