import { CustomLogTypeEnum } from './custom-log-type-enum.enum';
import { Moment } from 'moment';

/**
 * Author : Mehdi Aarab
 */
export class CustomLog {
    public type: CustomLogTypeEnum;
    public date: Moment;
    public origin: string;
    public message: string;
    public color: string;
    public size: number;

    public constructor(type: CustomLogTypeEnum, date: Moment, origin: string, message: string) {
        this.type = type;
        this.date = date;
        this.origin = origin;
        this.message = message;
    }
}
