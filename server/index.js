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
  options.cert = fs.readFileSync("./cert.pem");
  options.key = fs.readFileSync("./privkey.pem");
}

const server = https.createServer(options);

const wss = new WebSocket.Server({
  ...(process.env.NODE_ENV === "development" ? { port: 8081 } : { server }),
  verifyClient: info =>
    info.origin
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
//sessionID: {
//  host: {token socket username}
//  players: [{token socket username}, {token socket username}...]
//  seat: [{token, username}]
//}
//
const channels = {};

const CommandPacket = require('./packet.js');

// a new client connects
wss.on("connection", function connection(ws, req) {
  console.log("new connection found");

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
          if ( channels[channel].host.token == packet.sender ||
            channels[channel].players.some(
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
        case "sessionset": //If room number available, join. Otherwise, leave.
          packet.forEachCommand(analyse_room_command);
          break;

        case "sync":
          if(!channels[packet.session]) return;
          if(packet.sender == channels[packet.session].host.token){
            // similar to boardcast, but send from ST, rec by PL
            channels[packet.session].players.forEach((player) => {
              packet.receiver = player['token'];
              player['socket'].send(packet.serialize());
            });
          }else{
            console.log("error: a sync package not from ST.");
          }

          break;
        case "direct":
          if(!channels[packet.session]) return;
          if(packet.receiver == 'host') {
            channels[packet.session].host['socket'].send(packet.serialize());
            break;
          }
          if(channels[packet.session].host['token'] == packet.receiver) {
              channels[packet.session].host['socket'].send(packet.serialize());
              break;
          }
          channels[packet.session].players.forEach((player) => {
              if(player['token'] == packet.receiver) {
                player['socket'].send(packet.serialize());
              }
          });
          break;
        case "boardcast":
          if(!channels[packet.session]) return;
          channels[packet.session].host['socket'].send(packet.serialize());
          channels[packet.session].players.forEach((player) => {
              packet.receiver = player['token'];
              player['socket'].send(packet.serialize());
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

function set_online(client, token) {
  //previous socket online
  if(online_players[token]) {
    if (online_players[token]['socket'] === WebSocket.OPEN) {
      const a = new CommandPacket("require", session);
      a.addCommand("logout", "你在其它地方登录了,强制断开连接。");
      online_players[token]['socket'].send(a.serialize());  
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
        channels[channel].players.some(
          (player) => {
            return player['token'] == token;
          }
        ) ||
        channels[channel].host['token'] == token
      ) {
        a.addCommand("session_restore", channel);
      }
    }

    client.send(a.serialize());
  });
}

function set_leavegame(client, session, player) {
      // leave a session
      if(channels[session]) {
        const room = channels[session];

        const a = new CommandPacket("require");
        if(room.host.token == player.token) {
          a.addCommand("leave_session", "说书人解散了游戏。");
          room.players.forEach((pl)=>{
            pl.socket.send(a.serialize())
          })
          delete channels[session];
          return;
        }else{
          a.addCommand("clean_seat", player.token);
          room.host.socket.send(a.serialize());
        }
        
        // note others that someone leave the game.
        channels[session].players = channels[session].players.filter(item => item.token != player.token);
      
      }
}

function set_joingame(client, session, player) {

      for (let channel in channels) {
          if (channel == session) {
            continue;
          }
          if ( channels[channel].host.token == packet.sender ||
            channels[channel].players.some(
              (player) => {
                return player['token'] == packet.sender;
              }
            )
          ){
            const a = new CommandPacket("require", session);
            a.addCommand("note", "You aleady in another game.");
            client.send(a.serialize());  
            return;
          }
      }

      if(!channels[session]) {
        channels[session] = {
          host: player,
          players: [],
          seat: []
        }
        const a = new CommandPacket("sessionset", session);
        a.addCommand("state", "host");
        a.addCommand("reset", "");
        client.send(a.serialize());  

        console.log(session, "You host the game.");
        return;
      }

      const room = channels[session];

      if(room.host.token == player.token) {
        room.host.username = player.username;
        room.host.socket = player.socket;

        const a = new CommandPacket("sessionset", session);
        a.addCommand("state", "host");
        client.send(a.serialize());  

        console.log(session, "You back to host (already in).");
        return;
      }

      if(!room.players.some((pl)=> {
        if(pl.token == player.token) {
              pl.username = player.username;
              pl.socket = player.socket;
              const a = new CommandPacket("sessionset");
              a.addCommand("state", "play");
              client.send(a.serialize());  
              console.log(session, "You back to game (already in).");
              return true;
        }
        return false;
      })) {
        const a = new CommandPacket("sessionset");
        a.addCommand("state", "play");
        client.send(a.serialize());  
        console.log(session, "You join the game.");
        room.players.push(player);
      }     
}

function require_host(session, command, param) {
  const a = new CommandPacket("require");
  a.addCommand(command, param);
  channels[session].host.socket.send(a.serialize());  
}


function analyse_room_command(packet, cmd, param) {
  const sender_player = online_players[packet.sender];
  if(!sender_player) {
      console.log("You must login first.");
      return;
  }
  const room = channels[packet.session];
  switch (cmd) {
    case 'join':
      console.log("join request found");
      set_joingame(packet.sender_socket, packet.session, sender_player);
      break;

    case "leave":
      console.log("leave request found");
      set_leavegame(packet.sender_socket, packet.session, sender_player);
      break;
    case "kick":
      {
        const target_player = online_players[param]
        if (target_player) {
          const a = new CommandPacket("require");
          a.addCommand("leave_session", "你被说书人请出了房间。");
          target_player.socket.send(a.serialize());
        }
      }
      break;
    // case "claimseat":
    //   set_claimseat(packet.session, sender_player, Number(param));
    //   break;
    case "autoclaim":
      require_host(packet.session, "prepare_seat", 
        {token: sender_player.token, username: sender_player.username});
      
      break;
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
                  const a = new CommandPacket("login");
                  a.addCommand("failed","密码不匹配");
                  packet.sender_socket.send(a.serialize());
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
  console.log("server starting at :8081");
  server.listen(8081);
  server.on("request", (req, res) => {
    res.setHeader("Content-Type", register.contentType);
    register.metrics().then(out => res.end(out));
  });
}
