const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");
const client = require("prom-client");

// Create a Registry which registers the metrics
const register = new client.Registry();
// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: "clocktower-online"
});

const PING_INTERVAL = 30000; // 30 seconds

const options = {};

if (process.env.NODE_ENV !== "development") {
  options.cert = fs.readFileSync("cert.pem");
  options.key = fs.readFileSync("key.pem");
}

const server = https.createServer(options);
const wss = new WebSocket.Server({
  ...(process.env.NODE_ENV === "development" ? { port: 8081 } : { server }),
  verifyClient: info =>
    info.origin &&
    !!info.origin.match(
      /^https?:\/\/([^.]+\.github\.io|localhost|clocktower\.online|eddbra1nprivatetownsquare\.xyz)/i
    )
});

function noop() {}

// calculate latency on heartbeat
function heartbeat() {
  this.latency = Math.round((new Date().getTime() - this.pingStart) / 2);
  this.counter = 0;
  this.isAlive = true;
}

// currently online player
//token: {
//  'token': token,
//  'socket': client,
//  'username': data['username'],
//}
const online_players = {};

// map of channels currently in use
//
//sessionID: [{token socket username}, {token socket username}...]
//
const channels = {};

const CommandPacket = require('./packet.js');

// a new client connects
wss.on("connection", function connection(ws, req) {
  console.log("new connection found");
  // url pattern: clocktower.online/<channel>/<playerId|host>
  // const url = req.url.toLocaleLowerCase().split("/");
  // ws.playerId = url.pop();
  // check for another host on this channel

  ws.isAlive = true;
  ws.pingStart = new Date().getTime();

  ws.on("message", (data)=>{

      ws.counter++;
      if (ws.counter > (5 * PING_INTERVAL) / 1000) {
          console.log("disconnecting user due to spam");
          ws.close(
            1000,
            "Your app seems to be malfunctioning, please clear your browser cache."
          );
          return;
      }

      packet = CommandPacket.deserialize(data);
      console.log(packet);
      packet.sender_socket = ws;

      //try fill sender if not exist
      if(!packet.sender) {
        for (let playerid in online_players) {
          if (
            online_players[playerid]['socket'] == ws
          ) {
            packet.sender = playerid;
          }
        }
      }
      //try fill sessionID if not exist
      if(!packet.session) {
        for (let channel in channels) {
          if (
            channels[channel].some(
              (player) => {
                return player['token'] == packet.sender;
              }
            )
          ) {
            packet.session = channel;
          }
        }
      }
      switch(packet.header) {

        case "login":
          console.log("login request found");
          packet.forEachCommand(analyse_login_command);
          break;

        case "host":
          console.log("host request found");
          const sender_player = online_players[packet.sender];
          if(sender_player) {
            set_joingame(packet.session, sender_player);
          }else{
            console.log("You must login first.");
          }
          
          break;
        case "ping":
            // ping messages will only be sent host -> all or all -> host
            // channels[ws.channel].forEach(function each(client) {
            //   if (
            //     client !== ws &&
            //     client.readyState === WebSocket.OPEN &&
            //     (ws.playerId === "host" || client.playerId === "host")
            //   ) {
            //     client.send(
            //       data.replace(/latency/, (client.latency || 0) + (ws.latency || 0))
            //     );
            //     metrics.messages_outgoing.inc();
            //   }
            // });
            break;
        case "sync":

            break;
        case "direct":
          channels[packet.session].forEach((player) => {
              if(player['token'] == packet.receiver) {
                player['socket'].send(packet);
              }
          });
          break;
        case "boardcast":
          channels[packet.session].forEach((player) => {
              packet.receiver = player['token'];
              player['socket'].send(packet);
          });
          break;
        default:
          console.log("Unknown packet type:", packet.header);
          break;
      }
  });

  // start ping pong
  ws.ping(noop);
  ws.on("pong", heartbeat);
  // handle message
  }
);

function response(client, command, data) {
  const a = new CommandPacket("login");
  a.addCommand(command,data)
  client.send(a.serialize());
};


function set_online(client, token) {
  //previous socket online
  if(online_players[token]) {
    if (online_players[token]['socket'] === WebSocket.OPEN) {
      online_players[token]['socket'].close(1000, "Login in other site.");
    }
  }
  //response login success
  const datab = require('./database.js');
  datab.fetch_user_data(token, (data)=>{
    online_players[token] = {
      'token': token,
      'socket': client,
      'username': data['username'],
    }
    console.log("login success.");
    const a = new CommandPacket("login");
    a.addCommand("success",data);

    for (let channel in channels) {
      if (
        channels[channel].some(
          (player) => {
            return player['token'] == token;
          }
        )
      ) {
        a.addCommand("session_restore", channel);
      }
    }

    client.send(a.serialize());
  });
}


function set_joingame(session, player) {
  //previous socket online
            if(channels[session]) {
              if(!channels[session].some((pl)=> {
                  if(pl.token == player.token) {
                    pl.username = player.username;
                    pl.socket = player.socket;
                    console.log(session, "You back to game (already in).");
                    return true;
                  }
                  return false;
                })) {
                channels[session].push(player);
                console.log(session, "You join the game.");
              }
            }else{
              channels[session] = []
              channels[session].push(player);
              console.log(session, "You host the game.");
            }
}

function analyse_login_command(packet, cmd, param) {
  switch (cmd) {
      case 'login':
          try {
          const datab = require('./database.js');
          datab.db_init();
  
          const loginData = param;
          datab.user_login(loginData["username"], loginData["password"], (token)=>{
              if (token > 0) {
                  console.log(loginData["username"], "login success:", token);
                  set_online(packet.sender_socket, token);
              }else{
                  console.log(loginData["username"], "login failed.");
                  packet.sender_socket.close(1000, `Incorrect username or password.`);
              }
          });
          } catch (e) {
              console.log("error parsing direct message JSON", e);
          }
          break;
      case 'token':
          try {
              const datab = require('./database.js');
              datab.db_init();

              set_online(packet.sender_socket, param.token);

          } catch (e) {
              console.log("error parsing direct message JSON", e);
          }
          break;
      default:
          console.log("default", cmd, param);
  }
  
};

// start ping interval timer
const interval = setInterval(function ping() {
  // ping each client
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.pingStart = new Date().getTime();
    ws.ping(noop);
  });
  console.log(channels);
  // clean up empty channels
  if (channels.length > 0) {
    for (let channel in channels) {
      if (
        !channels[channel].length ||
        !channels[channel].some(
          (player) => {
            console.log(player);
            return player['socket'] &&
            (player['socket'].readyState === WebSocket.OPEN ||
              player['socket'].readyState === WebSocket.CONNECTING)
          }
            
        )
      ) {
        delete channels[channel];
      }
    }
  }
  
}, PING_INTERVAL);

// handle server shutdown
wss.on("close", function close() {
  clearInterval(interval);
});

// prod mode with stats API
if (process.env.NODE_ENV !== "development") {
  console.log("server starting");
  server.listen(8080);
  server.on("request", (req, res) => {
    res.setHeader("Content-Type", register.contentType);
    register.metrics().then(out => res.end(out));
  });
}
