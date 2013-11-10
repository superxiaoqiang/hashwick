declare var Promise: {
    // Core
    new<T>(resolver: (resolve: (value?: T) => void, reject: (value?: any) => void) => void): Promise<T>;
    fulfilled<T>(value?: T): Promise<T>;
    rejected(value?: any): Promise<any>;
    pending<T>(): PromiseResolver<T>;
    cast<T>(value: Thenable<T>): Promise<T>;
    cast<T>(value: T): Promise<T>;

    // Promisification
    promisify(nodeFunction: Function, receiver?: any): (...args: any[]) => Promise<any>;

    // Collections
    all<T>(values: Promise<T>[]): Promise<T[]>;
    all<T>(values: Promise<T[]>): Promise<T[]>;
    settle<T>(values: Promise<T>[]): Promise<PromiseInspection<T>[]>;
    settle<T>(values: Promise<T[]>): Promise<PromiseInspection<T>[]>;
    map<T, U>(values: Promise<T>[], mapper: (item: T, index: number, arrayLength: number) => Promise<U>): Promise<U[]>;
    map<T, U>(values: Promise<T>[], mapper: (item: T, index: number, arrayLength: number) => U): Promise<U[]>;
    map<T, U>(values: Promise<T[]>, mapper: (item: T, index: number, arrayLength: number) => Promise<U>): Promise<U[]>;
    map<T, U>(values: Promise<T[]>, mapper: (item: T, index: number, arrayLength: number) => U): Promise<U[]>;
    map<T, U>(values: T[], mapper: (item: T, index: number, arrayLength: number) => Promise<U>): Promise<U[]>;
    map<T, U>(values: T[], mapper: (item: T, index: number, arrayLength: number) => U): Promise<U[]>;
    filter<T>(values: Promise<T>[], filterer: (item: T, index: number, arrayLength: number) => boolean): Promise<T[]>;
    filter<T>(values: Promise<T[]>, filterer: (item: T, index: number, arrayLength: number) => boolean): Promise<T[]>;
    filter<T>(values: T[], filterer: (item: T, index: number, arrayLength: number) => boolean): Promise<T[]>;
};

interface Thenable<T> {
    then<U>(fulfilled?: (x: T) => Promise<U>, rejected?: (x: any) => any, progress?: (x: any) => void): Promise<U>;
    then<U>(fulfilled?: (x: T) => U, rejected?: (x: any) => U, progress?: (x: any) => void): Promise<U>;
}

interface Promise<T> extends Thenable<T> {
    // Core
    done<U>(fulfilled?: (x: T) => Promise<U>, rejected?: (x: any) => any, progress?: (x: any) => void): Promise<U>;
    done<U>(fulfilled?: (x: T) => U, rejected?: (x: any) => U, progress?: (x: any) => void): Promise<U>;
    catch(handler: (x: any) => void): Promise<T>;
    catch(predicate: Function, handler: (x: any) => void): Promise<T>;
    finally(handler: () => void): Promise<T>;

    // Utility
    nodeify(callback: (err: any, result: T) => void): Promise<T>;

    // Collections
    all(): Promise<any[]>;
    settle(): Promise<PromiseInspection<any>[]>;
    map<U>(mapper: (item: any, index: number, arrayLength: number) => Promise<U>): Promise<U[]>;
    map<U>(mapper: (item: any, index: number, arrayLength: number) => U): Promise<U[]>;
    filter(filterer: (item: any, index: number, arrayLength: number) => boolean): Promise<any[]>;
}

interface PromiseResolver<T> {
    promise: Promise<T>;
    fulfill(value: T): void;
    reject(reason: any): void;
    progress(value: any): void;
}

interface PromiseInspection<T> {
    isFulfilled(): boolean;
    isRejected(): boolean;
    isPending(): boolean;
    value(): T;
    error(): any;
}

declare module "bluebird" {
    export = Promise;
}
