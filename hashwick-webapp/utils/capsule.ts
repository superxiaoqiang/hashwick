export class Capsule<T> {
    constructor(public key: string, public name: string, public item: T) { }
}

export interface CapsuleRef<T> {
    key?: string;
    structure?: T;
}
