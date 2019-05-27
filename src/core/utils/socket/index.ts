// Log
import Debug from "debug";
import {Dispatcher} from "@server/src/core/utils/events/dispatcher";
import {EventWrapper} from "@server/src/core/utils/events/eventWrapper";

const
    log = Debug('server:socket'),
    logPacket = Debug('server:packets');

// Class
export default class SocketManager extends Dispatcher {
    // Base settings
    public socket: any = null;
    private connected: boolean = false;

    public debug: boolean = true;
    public log: boolean = true;
    public dispatchers: Dispatcher[] =[];

    constructor(socket: any) {
        super();
        if (socket) this.setSocket(socket);
    }

    private setSocket(socket: any) {
        this.socket = socket;
        let wrapper = new EventWrapper(this.socket)
            .on(['open', 'connect'], () => {
                this.connected = true;
                log('Connected');
                this.emitToDispatchers('socket::connected');
            })
            .on('data', packet => {
                if (this.debug) logPacket(`RCV %s (%o).`, packet.call, packet.data);
                else if (this.log) logPacket(`RCV %s.`, packet.data);
                this.emitToDispatchers('packet::all', packet.data);
                this.emitToDispatchers(`packet::${packet.call}`, packet.data);
            })
            .on('reconnect', attempt => {
                log(`Reconnecting... (%d).`, attempt);
            })
            .on('error', e => {
                log("An error has occured (%o).", e);
                wrapper.done("Error: " + e);
                this.emitToDispatchers('socket::error', e);
            })
            .on('close', () => {
                this.connected = false;
                log("Server's connection lost.");
                this.emitToDispatchers('socket::close');
            })
            .on(['end', 'disconnect'], () => {
                wrapper.done();
                log("Socket disconnected.");
                this.emitToDispatchers('socket::disconnected');
                this.destroy();
            })
    }

    private emitToDispatchers(callName: string, data?: any) {
        this.emit(callName,data);
        for (let elt of this.dispatchers) {
            elt.emit(callName, data);
        }
    }

    public disconnect(reason: string) {
        if (this.socket === null) return false;
        log("Disconnected (%o).", {reason});
        this.send("disconnecting", reason);
        this.destroy();
    }

    public destroy() {
        if (this.socket === null) {
            log("Trying to destroy an unexistant socket.");
            return false;
        }
        log("Destroying socket.");
        this.socket = null;
    }

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

    public getIp(): string {
        return this.socket.request.connection.remoteAddress.replace("::ffff:", "");
    }
}