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

run tsc -m commonjs --noImplicitAny -w server.ts
run tsc -m commonjs --noImplicitAny -w ../hashwick-webapp/app.ts
# sudo is there so it can listen on port 80
run sudo ../node_modules/.bin/supervisor -w .. -n exit server.js

# to debug, add '--debug' to the node command and uncomment this line
#run ../node_modules/.bin/node-inspector

wait
