CREATE SEQUENCE ticker_id_seq;

CREATE TABLE ticker (
    id INTEGER NOT NULL DEFAULT nextval('ticker_id_seq'),
    market_id INTEGER NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    last NUMERIC(16, 8) NOT NULL,
    bid NUMERIC(16, 8) NOT NULL,
    ask NUMERIC(16, 8) NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX ticker_market_id ON ticker (market_id, timestamp);


CREATE SEQUENCE trade_id_seq;

CREATE TABLE trade (
    id INTEGER NOT NULL DEFAULT nextval('trade_id_seq'),
    market_id INTEGER NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    flags INTEGER NOT NULL,
    price NUMERIC(16, 8) NOT NULL,
    amount NUMERIC(16, 8) NOT NULL,
    id_from_exchange VARCHAR(255),
    PRIMARY KEY (id)
);

CREATE INDEX trade_market_id_timestamp ON trade (market_id, timestamp);
CREATE INDEX trade_market_id_id_from_exchange ON trade (market_id, id_from_exchange);


CREATE SEQUENCE candle_id_seq;

CREATE TABLE candle (
    id INTEGER NOT NULL DEFAULT nextval('candle_id_seq'),
    market_id INTEGER NOT NULL,
    timespan INTEGER NOT NULL,
    start TIMESTAMP NOT NULL,
    open NUMERIC(16, 8) NOT NULL,
    close NUMERIC(16, 8) NOT NULL,
    low NUMERIC(16, 8) NOT NULL,
    high NUMERIC(16, 8) NOT NULL,
    volume NUMERIC(16, 8) NOT NULL,
    vwap NUMERIC(16, 8) NOT NULL,
    count INTEGER NOT NULL,
    buy_open NUMERIC(16, 8),
    sell_open NUMERIC(16, 8),
    buy_close NUMERIC(16, 8),
    sell_close NUMERIC(16, 8),
    buy_low NUMERIC(16, 8),
    sell_low NUMERIC(16, 8),
    buy_high NUMERIC(16, 8),
    sell_high NUMERIC(16, 8),
    buy_volume NUMERIC(16, 8) NOT NULL,
    sell_volume NUMERIC(16, 8) NOT NULL,
    buy_vwap NUMERIC(16, 8),
    sell_vwap NUMERIC(16, 8),
    buy_count INTEGER NOT NULL,
    sell_count INTEGER NOT NULL,
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX candle_market_id_timespan_start ON candle (market_id, timespan, start);


CREATE SEQUENCE depthsnapshotorder_id_seq;

CREATE TABLE depthsnapshotorder (
    id INTEGER NOT NULL DEFAULT nextval('depthsnapshotorder_id_seq'),
    market_id INTEGER NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    flags INTEGER NOT NULL,
    price NUMERIC(16, 8) NOT NULL,
    amount NUMERIC(16, 8) NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX depthsnapshotorder_market_id_timestamp_price ON depthsnapshotorder (market_id, timestamp, price);
