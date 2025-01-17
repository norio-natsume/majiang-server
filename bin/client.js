#!/usr/bin/env node

"use strict";

const io = require('socket.io-client');

function post(url, param, cookie, callback) {

    const http = require(url.slice(0,5) == 'https' ? 'https' : 'http');

    const req = http.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded',
                    Cookie:        `MAJIANG=${cookie}` }
    }, res =>{
        res.on('data', ()=>{});
        res.on('end',  ()=>callback(res));
    }).on('error', err =>{
        console.log(err.message);
    });
    req.write(new URLSearchParams(param).toString());
    req.end();

}

function login(url, name, room) {

    post(url + '/auth/', { name: name, passwd: '*'}, null, (res)=>{
        for (let cookie of res.headers['set-cookie'] || []) {
            if (! cookie.match(/^MAJIANG=/)) continue;
            cookie = cookie.replace(/^MAJIANG=/,'').replace(/; .*$/,'');
            console.log('cookie:', cookie);
            init(url, cookie, room);
        }
    });
}

function logout(cookie) {
    post(url + '/logout', '', cookie, ()=>{ process.exit() });
}

function error(msg, cookie) {
    console.log('ERROR:', msg);
    logout(cookie);
}

function init(url, cookie, room) {

    const server = url.replace(/^(https?:\/\/[^\/]*)\/.*$/,'$1');
    const path   = url.replace(/^https?:\/\/[^\/]*/,'').replace(/\/$/,'');
    const sock = io(server, {
                        path: `${path}/socket.io/`,
                        extraHeaders: {
                            Cookie: `MAJIANG=${cookie}`,
                        }
                    });

    if (argv.verbose) sock.onAny(console.log);
    sock.on('ERROR', (msg)=>{ error(msg, cookie) });
    sock.on('GAME',  (msg)=>{ sock.emit('GAME', { seq: msg.seq }) });
    sock.on('END',   ()   =>{ logout(cookie) });
    sock.on('ROOM',  ()   =>{ sock.on('HELLO', ()=>{ logout(cookie) })});

    process.on('SIGTERM', ()=>{ logout(cookie) });
    process.on('SIGINT',  ()=>{ logout(cookie) });

    sock.emit('ROOM', room);
}

const argv = require('yargs')
    .usage('Usage: $0 [ server-url ]')
    .option('name',     { alias: 'n', default: '*ボット*'})
    .option('room',     { alias: 'r', demandOption: true })
    .option('verbose',  { alias: 'v', boolean: true })
    .argv;

const url = (argv._[0] || 'http://127.0.0.1:4615/server').replace(/\/$/,'');

login(url, argv.name, argv.room);
