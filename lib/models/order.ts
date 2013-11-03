class Order {
    public static BID = 1;
    public static ASK = 2;

    constructor(public price: string, public amount: string) { }
}

export = Order;
