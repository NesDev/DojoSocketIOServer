import Debug from "debug";
import {Dispatcher} from "@server/src/core/utils/events/dispatcher";
import {EventWrapper} from "@server/src/core/utils/events/eventWrapper";

const
    log = Debug('server:socket'),
    logPacket = Debug('server:packets');

/**
 * Classe permettant de manipuler plus facilement un socket
 */
export default class SocketManager extends Dispatcher {
    // Le socket Initial
    public socket: any = null;
    // Pour savoir si on dois afficher tous les logs ou non
    public debug: boolean = true;
    public log: boolean = true;
    // Les differents dispatcher ou transmettre les informations concernant ce socket
    public dispatchers: Dispatcher[] = [];
    // Pour savoir si le socket est connecté ou non
    private connected: boolean = false;

    constructor(socket: any) {
        super();
        if (socket) this.setSocket(socket);
    }

    /**
     * Permet de deconnecté le socket en donnant la raison
     * @param reason
     */
    public disconnect(reason: string) {
        if (this.socket === null) return false;
        log("Disconnected (%o).", {reason});
        this.send("disconnecting", reason);
        this.destroy();
    }

    /**
     * Supprime totalement le socket
     */
    public destroy() {
        if (this.socket === null) {
            log("Trying to destroy an unexistant socket.");
            return false;
        }
        log("Destroying socket.");
        this.socket = null;
    }

    /**
     * Permet d'envoyer un packet avec le bon formatage
     * @param callName
     * @param data
     */
    public send(callName, data: any = {}) {
        if (this.socket === null) {
            return false;
        }
        if (this.debug) {
            logPacket('SNT %s (%o).', data.type || callName, data);
        } else {
            logPacket('SNT %s.', data.type || callName);
        }
        this.socket.emit('data', {call: callName, data});
    }

    /**
     * Recupére l'ip du client
     */
    public getIp(): string {
        return this.socket.request.connection.remoteAddress.replace("::ffff:", "");
    }

    private setSocket(socket: any) {
        this.socket = socket;
        let wrapper = new EventWrapper(this.socket)
        // Quand le socket se connecte
            .on(['open', 'connect'], () => {
                this.connected = true;
                log('Connected');
                this.emitToDispatchers('socket::connected');
            })
            // Quand le socket reçoi des données
            .on('data', packet => {
                if (this.debug) logPacket(`RCV %s (%o).`, packet.call, packet.data);
                else if (this.log) logPacket(`RCV %s.`, packet.data);
                this.emitToDispatchers('packet::all', packet.data);
                this.emitToDispatchers(`packet::${packet.call}`, packet.data);
            })
            // Quand le socket se reconnect
            .on('reconnect', attempt => {
                log(`Reconnecting... (%d).`, attempt);
            })
            // Quand le socket reçoi une erreur
            .on('error', e => {
                log("An error has occured (%o).", e);
                wrapper.done("Error: " + e);
                this.emitToDispatchers('socket::error', e);
            })
            // Quand le socket se ferme totalement
            .on('close', () => {
                this.connected = false;
                log("Server's connection lost.");
                this.emitToDispatchers('socket::close');
            })
            // Quand le socket se déconnecte
            .on(['end', 'disconnect'], () => {
                wrapper.done();
                log("Socket disconnected.");
                this.emitToDispatchers('socket::disconnected');
                this.destroy();
            })
    }

    /**
     * Emit un packet sur tous les dispatcher
     * @param callName
     * @param data
     */
    private emitToDispatchers(callName: string, data?: any) {
        this.emit(callName, data);
        for (let elt of this.dispatchers) {
            elt.emit(callName, data);
        }
    }
}
