import { Server } from "@server/src/core";
import SocketManager from "@server/src/core/utils/socket";
import { Dispatcher } from "@server/src/core/utils/events/dispatcher";
import { UserInformations } from "@server/src/core/models/types/userInformations";
import { EventWrapper } from "@server/src/core/utils/events/eventWrapper";
import { UserDisconnectedMessage } from "@server/src/core/models/packets/UserDisconnectedMessage";
import { ServerInformationsMessage } from "@server/src/core/models/packets/ServerInformationsMessage";
import { UserConnectedMessage } from "@server/src/core/models/packets/UserConnectedMessage";
import { CommandRequestMessage } from '@server/src/core/models/packets/CommandRequestMessage';
import { NewLogMessage } from '@server/src/core/models/packets/newLogMessage';
import { CustomLog } from '@server/src/core/models/types/custom-log';
import { CustomLogTypeEnum } from '@server/src/core/models/types/custom-log-type-enum.enum';
import { ChangeColorRequestMessage } from '@server/src/core/models/packets/ChangeColorRequestMessage';
import { UserInformationsUpdated } from '@server/src/core/models/packets/UserInformationsUpdated';
import { ChangeSizeRequestMessage } from '@server/src/core/models/packets/ChangeSizeRequestMessage';
import { ChangeWeightRequestMessage } from '@server/src/core/models/packets/ChangeWeightRequestMessage';
import { LogsUpdated } from '@server/src/core/models/packets/LogsUpdated';
import moment = require('@server/node_modules/moment');

/**
 * Classe permettant de gérer toute les actions/informations d'un utilisateur connecté
 */
export class User extends Dispatcher {
    // Les informations sur l'utilisateur
    public userInformations: UserInformations;

    public infos = 'Voici quelque commandes intéressantes : <br/><b>' +
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
        this.server.emit("event::UserConnectedMessage", {
            userInformations: this.userInformations
        } as UserConnectedMessage)
    }

    public sendServerInformations() {
        const infos = new ServerInformationsMessage();
        infos.users = [];
        infos.logs = this.server.logs;
        for (const user of this.server.users) {
            const userInfos = this.server.usersInformations.find((elt) => elt.login === user.userInformations.login);
            if (userInfos) {
                infos.users.push(userInfos);
            }
        }
        this.socket.send("ServerInformationsMessage", infos);
    }

    /**
     * Ecoute tous les evenements en rapport avec l'user même
     */
    private monitorPacketsUser() {
        this.wrapperUser = this.wrap();
        this.wrapperUser.on("packet::CommandRequestMessage", (packet: CommandRequestMessage) => {
            if (!packet.cmd || packet.cmd === '') return false;
            if (packet.cmd.indexOf('/cleanDojo') !== -1) {
                this.server.logs = [];
                this.server.saveDatas();
                this.server.emit("event::LogsUpdated", {
                    logs: this.server.logs
                } as LogsUpdated)
            } else if (packet.cmd.indexOf('/infos') !== -1) {
                const log = new CustomLog(CustomLogTypeEnum.NORMAL, moment(), "SERVER", this.infos);
                log.color = 'green';
                log.size = 15;
                this.socket.send("NewLogMessage", {
                    log
                })
            } else {
                const log = new CustomLog(CustomLogTypeEnum.NORMAL, moment(), this.userInformations.name, packet.cmd);
                log.color = this.userInformations.color;
                log.size = this.userInformations.size;
                this.server.emit("event::NewLogMessage", {
                    log
                } as NewLogMessage)
            }
        });
        this.wrapperUser.on("packet::ChangeColorRequestMessage", (packet: ChangeColorRequestMessage) => {
            this.userInformations.color = packet.newColor;
            const user = this.server.usersInformations.find((elt) => elt.login === this.userInformations.login);
            if (user) {
                user.color = packet.newColor;
            }
            this.server.emit("event::UserInformationsUpdated", {
                userInformations: user
            } as UserInformationsUpdated)
        });
        this.wrapperUser.on("packet::ChangeMyRoleByAdmin", (packet: any) => {
            const cmd = "L'utilisateur " + this.userInformations.name + " a voulu devenir admin, mais il n'est pas digne donc il reste simple utilisateur"
            const log = new CustomLog(CustomLogTypeEnum.NORMAL, moment(), this.userInformations.name, cmd);
            log.color = 'red';
            log.size = 15;
            this.server.emit("event::NewLogMessage", {
                log
            } as NewLogMessage)
        });
        this.wrapperUser.on("packet::KickUserRequestMessage", (packet: any) => {
            const cmd = this.userInformations.name + " a voulu kick l'utilisateur " + packet.login + ", pas cool de sa part pour la peine je le vire lui";
            const log = new CustomLog(CustomLogTypeEnum.NORMAL, moment(), this.userInformations.name, cmd);
            log.color = 'red';
            log.size = 15;
            this.server.emit("event::NewLogMessage", {
                log
            } as NewLogMessage);
            const log2 = new CustomLog(CustomLogTypeEnum.NORMAL, moment(), "SERVER", "Vous avez etait kick par le serveur");
            log2.color = 'green';
            log2.size = 15;
            this.socket.send("NewLogMessage", {
                log: log2
            });
            this.socket.disconnect("");
        });
        this.wrapperUser.on("packet::ChangeSizeRequestMessage", (packet: ChangeSizeRequestMessage) => {
            this.userInformations.size = packet.newSize;
            const user = this.server.usersInformations.find((elt) => elt.login === this.userInformations.login);
            if (user) {
                user.size = packet.newSize;
            }
            this.server.emit("event::UserInformationsUpdated", {
                userInformations: user
            } as UserInformationsUpdated)
        });
        this.wrapperUser.on("packet::ChangeWeightRequestMessage", (packet: ChangeWeightRequestMessage) => {
            this.userInformations.weight = packet.newWeight;
            const user = this.server.usersInformations.find((elt) => elt.login === this.userInformations.login);
            if (user) {
                user.weight = packet.newWeight;
            }
            this.server.emit("event::UserInformationsUpdated", {
                userInformations: user
            } as UserInformationsUpdated)
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
            this.server.emit("event::UserDisconnectedMessage", {
                login: this.userInformations.login,
                reason: ""
            } as UserDisconnectedMessage)
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
    }
}
