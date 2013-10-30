class MinMaxPair<T> {
    public min: T;
    public max: T;

    constructor(min?: T, max?: T) {
        this.min = <any>min;  // casts are to work around compiler bug >_>
        this.max = <any>max;
    }

    public static fromArray<T>(nums: T[]) {
        return new MinMaxPair(nums[0], nums[1]);
    }

    public grow(other: MinMaxPair<T>) {
        if (this.min === undefined || other.min < this.min)
            this.min = other.min;
        if (this.max === undefined || other.max > this.max)
            this.max = other.max;
    }
}

export = MinMaxPair;
