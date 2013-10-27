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

run tsc -m commonjs --noImplicitAny -w daemon.ts
run ../node_modules/.bin/supervisor -w .. -n exit daemon.js

# to debug, add '--debug' to the node command and uncomment this line
#run ../node_modules/.bin/node-inspector

wait
