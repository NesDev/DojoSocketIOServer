/**
 * User chat model
 */
import {Server} from "@server/src/core";
import SocketManager from "@server/src/core/utils/socket";
import {Dispatcher} from "@server/src/core/utils/events/dispatcher";
import {UserInformations} from "@server/src/core/user/userInformations";
import {EventWrapper} from "@server/src/core/utils/events/eventWrapper";
import {UserDisconnectedMessage} from "@server/src/core/models/packets/UserDisconnectedMessage";

export class User extends Dispatcher {
    public userInformations: UserInformations;
    private server: Server;
    private socket: SocketManager;
    private wrapperUser: EventWrapper;
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

    private monitorPacketsUser() {
        this.wrapperUser = this.wrap();
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

    private monitorPacketsServer() {
        this.wrapperServer = this.server.wrap();
        this.wrapperServer.on('event::UserDisconnectedMessage', (event: UserDisconnectedMessage) => {
            this.socket.send('packet::UserDisconnectedMessage', event);
        })
    }
}
