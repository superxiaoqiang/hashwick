Database bootstrap command:

    sudo -u postgres psql
        create database packrat;
    # then
    sudo -u postgres psql packrat < db/2013-11-03.sql

Webapp development command:

    ./node_modules/typescript/bin/tsc hashwick-webapp/app.ts --module commonjs --noImplicitAny &&
        sudo NODE_ENV=development node hashwick-server/server.js

Deployment command:

    cd deploy && ./deploy.sh
