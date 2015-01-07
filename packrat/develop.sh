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

run ../node_modules/typescript/bin/tsc -m commonjs --noImplicitAny -w daemon.ts
run ../node_modules/supervisor/lib/cli-wrapper.js -w ../lib -n exit --debug daemon.js

# to debug, add '--debug' to the node command and uncomment this line
run ../node_modules/node-inspector/bin/inspector.js

wait
