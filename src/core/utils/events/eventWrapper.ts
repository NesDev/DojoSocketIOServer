import {EventEmitter} from "events";
import {Dispatcher} from "@common/utils/events/dispatcher";

export class EventWrapper {
    private eventEmitter: EventEmitter;
    private events: { [name: string]: any } = {};
    public dispatcher: Dispatcher;

    constructor(eventEmitter: EventEmitter) {
        this.eventEmitter = eventEmitter;
    }

    public on(events: string | string[], callback: any): this {
        if (!Array.isArray(events)) events = [events];
        for (let event of events) {
            if (this.events[event] !== undefined)
                throw new Error(`(void: on) The event ${event} is already registered in wrapper.`);
            this.events[event] = callback;
            this.eventEmitter.on(event, callback);
        }
        return this;
    }

    public off(events: string | string[]): this {
        if (!Array.isArray(events)) events = [events];
        for (let event of events) {
            if (this.events[event] !== undefined) {
                this.eventEmitter.removeListener(event, this.events[event]);
                delete this.events[event];
            }
        }
        return this;
    }

    public next(event: string): Promise<any> {
        if (this.events[event] !== undefined)
            throw new Error(`(void: next) The event ${event} is already registered in wrapper.`);
        return new Promise((resolve, reject) => {
            let callback = data => {
                delete this.events[event];
                resolve(data);
            };
            this.events[event] = callback;
            this.eventEmitter.once(event, callback);
        })
    }


    public done(...args): this {
        if(this.dispatcher && this.dispatcher.wrappers){
            let wrapperIndex = this.dispatcher.wrappers.findIndex((elt) => elt === this);
            if(wrapperIndex !== -1){
                this.dispatcher.wrappers.splice(wrapperIndex,1);
            }
        }
        this.off(Object.keys(this.events));
        return this;
    }

    public doneWithoutOrigin(): this{
        this.off(Object.keys(this.events));
        return this;
    }
}

