/**
 * Informations d'un utilisateur
 */
import {IdentificationTypeEnum} from "@server/src/core/models/enums/IdentificationTypeEnum";

export class UserInformations {
    public login: string;
    public password: string;
    public type: IdentificationTypeEnum;
    public weight: number;
    public size: number;
    public color: string;
    public name: string;

    constructor(login: string, password: string) {
        this.login = login;
        this.password = password;
        this.name = login;
        this.type = IdentificationTypeEnum.CLIENT;
        this.weight = 1;
        this.size = 24;
        this.color = 'black';
    }
}
