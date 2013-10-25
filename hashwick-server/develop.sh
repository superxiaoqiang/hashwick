#!/bin/sh

on_exit() {
    kill -INT $tsc1_pid
    kill -INT $tsc2_pid
}
trap on_exit EXIT

tsc -m commonjs --noImplicitAny -w server.ts &
tsc1_pid=$!

tsc -m commonjs --noImplicitAny -w ../hashwick-webapp/app.ts &
tsc2_pid=$!

# sudo is there so it can listen on port 80
NODE_ENV=development sudo node_modules/.bin/nodemon --debug server.js
