'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const cluster = require('cluster');
const https = require('https');
const querystring = require('querystring');
const msgpack = require('msgpack');
const shortid = require('shortid');
const jwt = require('jsonwebtoken');
const utils = require('microservice-utils');
const useHost = 'micro02.sgdev.vcube.com';
const wssServers = [
  'wss://' + useHost + ':9999/vcube'
];

class Bot {

  constructor() {
    this.socket = undefined;
    this.uuid = undefined;
  }

  connect(email, password, callback) {
    const self = this;

    let postData = querystring.stringify({
      email: email,
      pwd: password,
      deviceId: email
    });

    let postOpts = {
      host: useHost,
      port: '53547',
      path: '/api/v1/auth/SignIn',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      },
      key: fs.readFileSync(path.join(__dirname, './certs/test-client-cert-private-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, './certs/test-client-cert.pem')),
      ca: [fs.readFileSync(path.join(__dirname, './certs/test-root-cert.pem'))],
      rejectUnauthorized: false
    };

    postOpts.agent = new https.Agent(postOpts);

    let postReq = https.request(postOpts, function (res) {
      res.setEncoding('utf8');
      res.on('data', function (signInRes) {

        const tokens = JSON.parse(signInRes).tokenPair;

        let decodedAccessToken = jwt.decode(tokens.accessToken);
        self.uuid = decodedAccessToken.uid;

        /*
         * Connect to WebSocket server.
         */
        self.socket = new (require('ws'))(utils.pickRandomly(wssServers), {
          key: fs.readFileSync(path.join(__dirname, './certs/test-client-cert-private-key.pem')),
          cert: fs.readFileSync(path.join(__dirname, './certs/test-client-cert.pem')),
          ca: [fs.readFileSync(path.join(__dirname, './certs/test-root-cert.pem'))],
          rejectUnauthorized: false,
          headers: {
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken
          }
        });

        callback();
      });
    });

    postReq.write(postData);
    postReq.end();

    postReq.on('error', (error) => {
      console.warn(error);
    });
  };

  listen(callback) {
    const self = this;

    self.socket.on('open', () => {
      console.log("Socket open");

      /*
       * Heartbeat every 15s.
       */
      (function heartbeat() {
        self.socket.ping(1);
        setTimeout(heartbeat, 15 * 1000);
      })();
    });

    self.socket.on('error', (error) => {
      console.warn(error);
    });

    self.socket.on('close', (code, message) => {
      console.warn('Connection closed, code: ' + code + ', message: ' + message + '<<<<<<<<<');
    });

    self.socket.on('message', (data, flags) => {
      let rawBinary = new Uint8Array(data);
      let unpackedRecvMsg = msgpack.unpack(rawBinary);

      if(unpackedRecvMsg.sender === self.uuid) {
        console.log('You send ' + unpackedRecvMsg.content);
      } else {
        callback(unpackedRecvMsg);
      }

    });
  };

  disconnect() {

  };

  reply(data, reply) {
    this.socket.send(msgpack.pack({
      lang: 'en',
      messageType: 'TEXT',
      content: reply,
      toConversationId: data.toConversationId,
      forGroupId: data.forGroupId,
      mentionedUserUserIds: [],
      mentionedMessageMessageIds: [],
      conversationType: data.conversationType
    }), (err) => {
      if (err) {
        console.warn(err);
      }
    });
  };
}

console.log("Connection");

const gate = new Bot();

gate.connect('leonard.shi+0001@vcube.co.jp', 'Sy4ti2Sue', function () {
  console.log("connected");

  gate.listen(function (data) {
    console.log('Message from: ' + data.sender + ', and the content is: ' + data.content);
    gate.reply(data, 'Hello world');
  })
});

