import {Server} from "@server/src/core";
import SocketManager from "@server/src/core/utils/socket";
import {Dispatcher} from "@server/src/core/utils/events/dispatcher";
import {UserInformations} from "@server/src/core/models/types/userInformations";
import {EventWrapper} from "@server/src/core/utils/events/eventWrapper";
import {UserDisconnectedMessage} from "@server/src/core/models/packets/UserDisconnectedMessage";

/**
 * Classe permettant de gérer toute les actions/informations d'un utilisateur connecté
 */
export class User extends Dispatcher {
    // Les informations sur l'utilisateur
    public userInformations: UserInformations;
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

    /**
     * Ecoute tous les evenements en rapport avec l'user même
     */
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

    /**
     * Ecoute tous les evenements en rapport avec le server
     */
    private monitorPacketsServer() {
        this.wrapperServer = this.server.wrap();
        this.wrapperServer.on('event::UserDisconnectedMessage', (event: UserDisconnectedMessage) => {
            this.socket.send('packet::UserDisconnectedMessage', event);
        })
    }
}
