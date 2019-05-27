import {EventWrapper} from "./eventWrapper";
import {EventEmitter} from "events";

export class Dispatcher {
    public eventEmitter: EventEmitter = new EventEmitter();
    // La liste des ecouteurs actuelement en cours d'écoute
    public wrappers: EventWrapper[] = [];
    // Créer un ecouteur
    public wrap() {
        let wrapper = new EventWrapper(this.eventEmitter);
        wrapper.dispatcher = this;
        this.wrappers.push(wrapper);
        return wrapper;
    }
    // Envoi un packet sur l'emitter pour que tous les ecouteurs le reçoive
    public emit(events: string | string[], data?: any) {
        if (!Array.isArray(events)) events = [events];
        for (let event of events)
            this.eventEmitter.emit(event, data);
    }
    // Ferme tous les ecouteurs
    public done(): this {
        for (let wrapper of this.wrappers) {
            wrapper.doneWithoutOrigin();
        }
        this.wrappers = [];
        return this;
    }
}
