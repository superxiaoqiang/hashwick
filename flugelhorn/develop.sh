#!/bin/sh

on_exit() {
    kill -INT $tsc_pid
    kill -INT $ni_pid
}
trap on_exit EXIT

tsc -m commonjs --noImplicitAny -w daemon.ts &
tsc_pid=$!

node_modules/.bin/node-inspector &
ni_pid=$!

NODE_ENV=development node_modules/.bin/nodemon --debug daemon.js
