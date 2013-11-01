declare var Promise: {
    new<T>(resolver: (resolve: (value?: T) => void, reject: (value?: any) => void) => void): Promise<T>;
};

interface Promise<T> {
    then<U>(fulfilled?: (x: T) => U, rejected?: (x: any) => U, progress?: (x: any) => void): Promise<U>;
    done<U>(fulfilled?: (x: T) => U, rejected?: (x: any) => U, progress?: (x: any) => void): Promise<U>;
}

declare module "bluebird" {
    export = Promise;
}
