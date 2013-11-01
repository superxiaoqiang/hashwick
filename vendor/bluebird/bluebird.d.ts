declare var Promise: {
    // Core
    new<T>(resolver: (resolve: (value?: T) => void, reject: (value?: any) => void) => void): Promise<T>;
    fulfilled<T>(value?: T): Promise<T>;
    rejected(value?: any): Promise<any>;

    // Promisification
    promisify(nodeFunction: Function, receiver?: any): (...args: any[]) => Promise<any>;
};

interface Promise<T> {
    // Core
    then<U>(fulfilled?: (x: T) => Promise<U>, rejected?: (x: any) => any, progress?: (x: any) => void): Promise<U>;
    then<U>(fulfilled?: (x: T) => U, rejected?: (x: any) => U, progress?: (x: any) => void): Promise<U>;
    done<U>(fulfilled?: (x: T) => Promise<U>, rejected?: (x: any) => any, progress?: (x: any) => void): Promise<U>;
    done<U>(fulfilled?: (x: T) => U, rejected?: (x: any) => U, progress?: (x: any) => void): Promise<U>;

    // Utility
    nodeify(callback: (err: any, result: T) => void): Promise<T>;
}

declare module "bluebird" {
    export = Promise;
}
