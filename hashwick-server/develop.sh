#!/bin/sh

on_exit() {
    kill -INT $pids
    wait $pids
}
trap on_exit EXIT

run() {
    $* &
    pids="$pids $!"
}


export NODE_ENV=development

run ../node_modules/.bin/tsc -m commonjs --noImplicitAny -w server.ts
run ../node_modules/.bin/tsc -m commonjs --noImplicitAny -w ../hashwick-webapp/app.ts
# sudo is there so it can listen on port 80
run sudo -E ../node_modules/.bin/supervisor -w ../lib -w . -n exit server.js

# to debug, add '--debug' to the node command and uncomment this line
#run ../node_modules/.bin/node-inspector

wait

