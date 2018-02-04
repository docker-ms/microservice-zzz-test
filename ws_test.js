'use strict';

let hasReplied = false;

const startFrom = +process.argv[2];
const toIncluded = +process.argv[3];

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

// const useHost = 'localhost';
const useHost = 'micro02.sgdev.vcube.com';

const wssServers = [
  'wss://' + useHost + ':9999/vcube'
];

const msgs = [
  'Ṱ̺̺̕o͞ ̷i̲̬͇̪͙n̝̗͕v̟̜̘̦͟o̶̙̰̠kè͚̮̺̪̹̱̤ ̖t̝͕̳̣̻̪͞h̼͓̲̦̳̘̲e͇̣̰̦̬͎ ̢̼̻̱̘h͚͎͙̜̣̲ͅi̦̲̣̰̤v̻͍e̺̭̳̪̰-m̢iͅn̖̺̞̲̯̰d̵̼̟͙̩̼̘̳ ̞̥̱̳̭r̛̗̘e͙p͠r̼̞̻̭̗e̺̠̣͟s̘͇̳͍̝͉e͉̥̯̞̲͚̬͜ǹ̬͎͎̟̖͇̤t͍̬̤͓̼̭͘ͅi̪̱n͠g̴͉ ͏͉ͅc̬̟h͡a̫̻̯͘o̫̟̖͍̙̝͉s̗̦̲.̨̹͈̣',
  '𝕿𝖍𝖊 𝖖𝖚𝖎𝖈𝖐 𝖇𝖗𝖔𝖜𝖓 𝖋𝖔𝖝 𝖏𝖚𝖒𝖕𝖘 𝖔𝖛𝖊𝖗 𝖙𝖍𝖊 𝖑𝖆𝖟𝖞 𝖉𝖔𝖌',
  '⒯⒣⒠ ⒬⒰⒤⒞⒦ ⒝⒭⒪⒲⒩ ⒡⒪⒳ ⒥⒰⒨⒫⒮ ⒪⒱⒠⒭ ⒯⒣⒠ ⒧⒜⒵⒴ ⒟⒪⒢',
  '<script\x0Ctype="text/javascript">javascript:alert(1);</script>',
  '../../../../../../../../../../../etc/passwd%00',
  '() { _; } >_[$($())] { touch /tmp/blns.shellshock2.fail; }',
  'Powerلُلُصّبُلُلصّبُررً ॣ ॣh ॣ ॣ冗',
  '🐵 🙈 🙉 🙊',
  '0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟',
  '❤️ 💔 💌 💕 💞 💓 💗 💖 💘 💝 💟 💜 💛 💚 💙'
];

const addDelay = (email, delay, userNo) => {
  setTimeout(() => {

    let postData = querystring.stringify({
      email: email,
      pwd: 'Sy4ti2Sue',
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

    let postReq = https.request(postOpts, function(res) {
      
      res.setEncoding('utf8');

      res.on('data', function (signInRes) {

        const tokens = JSON.parse(signInRes).tokenPair;

        let decodedAccessToken = jwt.decode(tokens.accessToken);

        /*
         * Connect to WebSocket server.
         */
        let ws = new (require('ws'))(utils.pickRandomly(wssServers), {
          key: fs.readFileSync(path.join(__dirname, './certs/test-client-cert-private-key.pem')),
          cert: fs.readFileSync(path.join(__dirname, './certs/test-client-cert.pem')),
          ca: [fs.readFileSync(path.join(__dirname, './certs/test-root-cert.pem'))],
          rejectUnauthorized: false,
          headers: {
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken
          }
        });

        ws.on('open', () => {
          /*
           * Heartbeat every 15s.
           */
          (function heartbeat() {
            ws.ping(1);
            setTimeout(heartbeat, 15 * 1000);
          })();
        });

        ws.on('message', (data, flags) => {

          let rawBinary = new Uint8Array(data);
          let unpackedRecvMsg = msgpack.unpack(rawBinary);
          console.log('me: ' + email + ', received message from: ' + unpackedRecvMsg.sender + ', and the content is:\n' + JSON.stringify(unpackedRecvMsg) + '\n');

          if (!hasReplied) {
            ws.send(msgpack.pack({
              lang: 'en',
              messageType: 'TEXT',
              content: utils.pickRandomly(msgs),
              toConversationId: unpackedRecvMsg.toConversationId,
              forGroupId: unpackedRecvMsg.forGroupId,
              mentionedUserUserIds: [],
              mentionedMessageMessageIds: [],
              conversationType: unpackedRecvMsg.conversationType
            }), (err) => {
              if (err) {
                // What should we do here?
                console.warn(error);
              }
            });
            
            hasReplied = true;

            setTimeout(() => {
              hasReplied = false;
            }, 10000);
          }
          
        });

        ws.on('error', (error) => {
          console.warn(error);
        });

        ws.on('close', (code, message) => {
          // console.warn('Connection closed, code: ' + code + ', message: ' + message + '<<<<<<<<<');
        });

      });
    });

    postReq.write(postData);
    postReq.end();

    postReq.on('error', (error) => {
      console.warn(error);
    });

  }, delay);
};

if (cluster.isMaster) {

  const numOfWorkers = os.cpus().length;
  for (var i = 0; i < numOfWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    cluster.fork();
  });

} else {

  for (let i = startFrom; i <= toIncluded; i++) {

    let userNo = i;

    let userEmailPrefix = '' + userNo;

    while (userEmailPrefix.length < 4) {
      userEmailPrefix = '0' + userEmailPrefix;
    }

    let email = 'leonard.shi+' + userEmailPrefix + '@vcube.co.jp';

    addDelay(email, 200, userNo);

  }

}


