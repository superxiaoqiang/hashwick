declare var Promise: {
    // Core
    new<T>(resolver: (resolve: (value?: T) => void, reject: (value?: any) => void) => void): Promise<T>;
    fulfilled<T>(value?: T): Promise<T>;
    rejected(value?: any): Promise<any>;

    // Promisification
    promisify(nodeFunction: Function, receiver?: any): (...args: any[]) => Promise<any>;

    // Collections
    all<T>(values: Promise<T>[]): Promise<T[]>;
    all<T>(values: Promise<T[]>): Promise<T[]>;
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

interface Promise<T> {
    // Core
    then<U>(fulfilled?: (x: T) => Promise<U>, rejected?: (x: any) => any, progress?: (x: any) => void): Promise<U>;
    then<U>(fulfilled?: (x: T) => U, rejected?: (x: any) => U, progress?: (x: any) => void): Promise<U>;
    done<U>(fulfilled?: (x: T) => Promise<U>, rejected?: (x: any) => any, progress?: (x: any) => void): Promise<U>;
    done<U>(fulfilled?: (x: T) => U, rejected?: (x: any) => U, progress?: (x: any) => void): Promise<U>;

    // Utility
    nodeify(callback: (err: any, result: T) => void): Promise<T>;

    // Collections
    all(): Promise<any[]>;
    map<U>(mapper: (item: any, index: number, arrayLength: number) => Promise<U>): Promise<U[]>;
    map<U>(mapper: (item: any, index: number, arrayLength: number) => U): Promise<U[]>;
    filter(filterer: (item: any, index: number, arrayLength: number) => boolean): Promise<any[]>;
}

declare module "bluebird" {
    export = Promise;
}
