import {EventWrapper} from "./eventWrapper";
import {EventEmitter} from "events";
import {jsonIgnore} from "@common/node_modules/json-ignore";

export class Dispatcher {
    @jsonIgnore() public eventEmitter: EventEmitter = new EventEmitter();
    @jsonIgnore() public wrappers: EventWrapper[] = [];

    public wrap() {
        let wrapper = new EventWrapper(this.eventEmitter);
        wrapper.dispatcher = this;
        this.wrappers.push(wrapper);
        return wrapper;
    }

    public emit(events: string | string[], data?: any) {
        if (!Array.isArray(events)) events = [events];
        for (let event of events)
            this.eventEmitter.emit(event, data);
    }

    public done(): this {
        for (let wrapper of this.wrappers) {
            wrapper.doneWithoutOrigin();
        }
        this.wrappers = [];
        return this;
    }
}
