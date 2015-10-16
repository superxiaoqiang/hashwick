# HashWick

A bitcoin charting site. Discontinued in 2013. Preserved here for posterity.

![](https://raw.githubusercontent.com/johnsoft/hashwick/master/screenshot.png)

## Development

Database bootstrap command:

    sudo -u postgres psql
        create database packrat;
    # then
    sudo -u postgres psql packrat < db/2013-11-03.sql

The dev workflow needs an overhaul. I failed to document what I used to do to make the dev workflow quick. This is ugly but works for now if you restart terminal 3 after server changes:

    # terminal 1
    ./node_modules/typescript/bin/tsc hashwick-server/server.ts -w --module commonjs --noImplicitAny
    # terminal 2
    ./node_modules/typescript/bin/tsc hashwick-webapp/app.ts -w --module commonjs --noImplicitAny
    # terminal 3
    sudo NODE_ENV=development node hashwick-server/server.js

## Deployment

First-time server setup:

    wget -qO- https://get.docker.com/ | sh
    apt-get install jq postgresql-client

Deployment command:

    cd deploy && ./deploy.sh user@server
