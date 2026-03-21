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

const PING_INTERVAL = 10000;        // 20秒发送一次 ping
const MAX_MISSED_PINGS = 6;         // 允许连续丢失 5 次 ping

const options = {};

if (process.env.NODE_ENV !== "development") {
  options.cert = fs.readFileSync("/etc/letsencrypt/live/yanice.online/cert.pem");
  options.key = fs.readFileSync("/etc/letsencrypt/live/yanice.online/privkey.pem");
}

const server = https.createServer(options);

const wss = new WebSocket.Server({
  ...(process.env.NODE_ENV === "development" ? { port: 8081 } : { server }),
  verifyClient: info =>
    info.origin
});

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

const offline_counter = {'counter': 1000}

function next_offline_room() {
  cnt = offline_counter['counter'];
  offline_counter['counter'] = cnt + 1;
  return '__offline__'+cnt;
}

const CommandPacket = require('./packet.js');
const FlaskClient = require('./user_system'); // 路径根据你的文件位置调整
const { ALL } = require("dns");

const flaskClient = new FlaskClient();

function set_online(client, token) {
  //previous socket online
  if(online_players[token]) {
    if (online_players[token]['socket']) {
      const a = new CommandPacket("require");
      a.addCommand("logout", "你在其它地方登录了。你被强制断开链接。");
      online_players[token]['socket'].send(a.serialize());  
      online_players[token]['socket'].close(1000, "Login in other site.");
    }
  }
  //response login success
  flaskClient.getUser(token).then((data)=>{
  //const datab = require('./database.js');
  // datab.fetch_user_data(token, (data)=>{
    let new_pl = {
      'token': token,
      'socket': client,
      'username': data['username'],
      'is_storyteller': data['is_storyteller'],
      'is_storyteller_vocal': data['is_storyteller_vocal']
    }


    client.userId = token;
    client.username = data['username'];

    online_players[token] = new_pl;
    const a = new CommandPacket("login");
    a.addCommand("success",data);
    client.send(a.serialize());

    for (let channel in channels) {

      if(channels[channel].host['token'] == token) {
        set_joingame(client, channel, new_pl);
        return;
      }

      if (
        channels[channel].players.some(
          (player) => {
            return player['token'] == token;
          }
        )
      ) {
        set_joingame(client, channel, new_pl);
        return;
      }

      if (
        channels[channel].watchers.some(
          (player) => {
            return player['token'] == token;
          }
        )
      ) {
        set_watchgame(client, channel, new_pl);
        return;
      }
    }

    let leave_command = new CommandPacket("sessionset", '');
    leave_command.addCommand("state", "leave");
    client.send(leave_command.serialize());

  });
}

function set_leavegame(client, session, player) {
      // leave a session
      if(channels[session]) {
        const room = channels[session];

        let leave_command = new CommandPacket("sessionset", session);
        leave_command.addCommand("state", "leave");
        client.send(leave_command.serialize());

        if(room.host.token == player.token) {
          leave_command.addCommand("info", "说书人解散了游戏。");
          room.players.forEach((pl)=>{
            pl.socket.send(leave_command.serialize())
          })
          delete channels[session];
          return;
        }else{
          if (room.paused) {
            room.pause_leave.push(player.token);
          } else {
            let require_command = new CommandPacket("require", session);
            require_command.addCommand("clean_seat", player.token);
            room.host.socket.send(require_command.serialize());
          }
        }
        
        channels[session].players = channels[session].players.filter(item => item.token != player.token);
        channels[session].watchers = channels[session].watchers.filter(item => item.token != player.token);
      
      }
}

function set_joingame(client, session, player, mdict) {
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
            const a = new CommandPacket("sessionset", session);
            a.addCommand("info", "你已经在另一场游戏中了！");
            client.send(a.serialize());  
            return;
          }
      }
      if(session == '__offline__') {
        offlineid = next_offline_room();
        channels[offlineid] = {
           host: player,
           players: [],
           watchers: [],
           seat: [],
           mdict: false,
           paused: false,
           pause_leave: []
         }
         const a = new CommandPacket("sessionset", offlineid);
         a.addCommand("mdict", false);
         a.addCommand("state", "host");
         a.addCommand("reset", "");
         client.send(a.serialize());  
         return;
      }
      if(!channels[session]) {
        if(!player.is_storyteller) {
          const a = new CommandPacket("sessionset", session);
          a.addCommand("info", "房间号不存在（你没有权限创建房间）！请联系管理员获取权限，或加入现有的房间。");
          client.send(a.serialize()); 
          return;
        }
        if(mdict && !player.is_storyteller_vocal) {
          const a = new CommandPacket("sessionset", session);
          a.addCommand("info", "你没有权限创建具有内置语音的房间！请联系管理员获取权限，或取消勾选内置语音。");
          client.send(a.serialize()); 
          return;
        }
        channels[session] = {
         host: player,
          players: [],
          watchers: [],
          seat: [],
          mdict: mdict,
          paused: false,
          pause_leave: []
        }
        const a = new CommandPacket("sessionset", session);
        a.addCommand("mdict", mdict);
        a.addCommand("state", "host");
        a.addCommand("reset", "");
        client.send(a.serialize());  

        return;
      }

      const room = channels[session];

      if(room.host.token == player.token) {
        room.host.username = player.username;
        room.host.socket = player.socket;

        const a = new CommandPacket("sessionset", session);
        a.addCommand("mdict", room.mdict);
        a.addCommand("state", "host");
        client.send(a.serialize());  

        room.paused = false;
        const p = new CommandPacket("sessionset", session);
        p.addCommand("pause", false);
        routeTo(session, p, Router.ALL);

        // clean seats of players who left during pause.
        let require_command = new CommandPacket("require", session);
        for (let token of room.pause_leave) {
          require_command.addCommand("clean_seat", token);
        }
        room.host.socket.send(require_command.serialize());
        room.pause_leave = [];

        return;
      }

      if(!room.players.some((pl)=> {
        if(pl.token == player.token) {

              pl.username = player.username;
              pl.socket = player.socket;
              const a = new CommandPacket("sessionset", session);
              a.addCommand("mdict", room.mdict);
              a.addCommand("state", "play");
              if(room.paused) {
                a.addCommand("pause", true);
              }
              client.send(a.serialize());  

              const packet = new CommandPacket("request");
              packet.addCommand("players/update", {player: player.token, property: 'isOnline', value: true});
              room.host['socket'].send(packet.serialize());
              //note online state.

              return true;
        }
        return false;
      })) {

        if(room.paused) {
          const a = new CommandPacket("sessionset", session);
          a.addCommand("info", "该房间暂停中（说书人处于离线状态），请等待说书人重新连接。");
          client.send(a.serialize()); 
          return;
        }
        const a = new CommandPacket("sessionset", session);
        a.addCommand("mdict", room.mdict);
        a.addCommand("state", "play");
        client.send(a.serialize());  
        room.players.push(player);

        const packet = new CommandPacket("request");
        packet.addCommand("players/update", {player: player.token, property: 'isOnline', value: true});
        room.host['socket'].send(packet.serialize());
        //note online state.
      }     
}

function set_watchgame(client, session, player) {
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
            const a = new CommandPacket("sessionset", session);
            a.addCommand("info", "你已经在另一场游戏中了！");
            client.send(a.serialize());   
            return;
          }
      }

      if(!channels[session]) {
        const a = new CommandPacket("sessionset", session);
        a.addCommand("info", "尝试观战的房间不存在！");
        client.send(a.serialize());  
        return;
      }

      const room = channels[session];

      if(room.host.token == player.token) {
        const a = new CommandPacket("sessionset", session);
        a.addCommand("info", "你已经是该游戏说书人了！");
        client.send(a.serialize());  
        return;
      }

      if(!room.players.some((pl)=> {
        if(pl.token == player.token) {
          const a = new CommandPacket("sessionset", session);
          a.addCommand("info", "你已经该游戏玩家了！");
          client.send(a.serialize());  
              return true;
        }
        return false;
      })) {

        if(!room.watchers.some((pl)=> {
          if(pl.token == player.token) {
                pl.username = player.username;
                pl.socket = player.socket;
                const a = new CommandPacket("sessionset", session);
                a.addCommand("mdict", room.mdict);
                a.addCommand("state", "watch");
                client.send(a.serialize());  
                return true;
          }
          return false;
        })) {
          const a = new CommandPacket("sessionset", session);
          a.addCommand("mdict", room.mdict);
          a.addCommand("state", "watch");
          client.send(a.serialize());  
          room.watchers.push(player);
        }
        //note online state.
      }     
}

function require_host(session, command, param) {
  const a = new CommandPacket("require");
  a.addCommand(command, param);
  channels[session].host.socket.send(a.serialize());  
}

// Router enum for routing targets
const Router = {
  TARGET: 1,    // Route to specific receiver (packet.receiver)
  HOST: 2,      // Route to host
  PLAYER: 4,    // Route to all players
  WATCHER: 8,   // Route to all watchers
  ALL: 15       // HOST | PLAYER | WATCHER
};

// Helper: unified routing function
function routeTo(session, packet, router) {
  const room = channels[session];
  if (!room) return;
  
  const sentTokens = new Set(); // Track sent tokens to avoid duplicates
  
  // Helper function to send to a specific token if not already sent
  const sendToToken = (token, socket) => {
    if (!sentTokens.has(token)) {
      packet.receiver = token;
      socket.send(packet.serialize());
      sentTokens.add(token);
    }
  };
  
  // Route to specific target (packet.receiver)
  if (router & Router.TARGET) {
    if (packet.receiver === 'host' || room.host.token === packet.receiver) {
      sendToToken(room.host.token, room.host.socket);
    } else {
      // Check players
      const targetPlayer = room.players.find(pl => pl.token === packet.receiver);
      if (targetPlayer) {
        sendToToken(targetPlayer.token, targetPlayer.socket);
      } else {
        // Check watchers
        const targetWatcher = room.watchers.find(pl => pl.token === packet.receiver);
        if (targetWatcher) {
          sendToToken(targetWatcher.token, targetWatcher.socket);
        }
      }
    }
  }
  
  // Route to host
  if (router & Router.HOST) {
    sendToToken(room.host.token, room.host.socket);
  }
  
  // Route to all players
  if (router & Router.PLAYER) {
    room.players.forEach(pl => {
      sendToToken(pl.token, pl.socket);
    });
  }
  
  // Route to all watchers
  if (router & Router.WATCHER) {
    room.watchers.forEach(pl => {
      sendToToken(pl.token, pl.socket);
    });
  }
}

function analyse_room_command(packet, cmd, param) {
  const sender_player = online_players[packet.sender];
  if(!sender_player) {
      console.log("[ERROR] Login first.");
      return;
  }
  const room = channels[packet.session];
  
  if(!room && cmd != 'join') return;

  switch (cmd) {
    case 'join':
      set_joingame(packet.sender_socket, packet.session, sender_player, param); 
      //when join, param T/F shows whether Mdict (enable vocal)
      break;
    case 'watch':
      set_watchgame(packet.sender_socket, packet.session, sender_player);
      break;
    case "leave":
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
    case "private_chat":
      if (param) {
        const a = new CommandPacket("sessionset");
        a.addCommand("private_chat", param);
        sender_player.socket.send(a.serialize());
        online_players[request[1]].socket.send(a.serialize());
      }else{
        const a = new CommandPacket("sessionset");
        a.addCommand("private_chat", '');
        sender_player.socket.send(a.serialize());
        online_players[request[1]].socket.send(a.serialize());
      }
      break;
    case "chat_permit":
        if (param) {
          const a = new CommandPacket("sessionset");
          a.addCommand("private_chat", param);
          sender_player.socket.send(a.serialize());
          online_players[request[1]].socket.send(a.serialize());
        }else{
          const a = new CommandPacket("sessionset");
          a.addCommand("private_chat", '');
          sender_player.socket.send(a.serialize());
          online_players[request[1]].socket.send(a.serialize());
        }
        break;
    case "follow_chat":
      let frequest = ['',''];
      let freceive = ['__x-','__x-'];
      room.privchat_pair.forEach((pair)=>{
        if (pair[0] == param) {
          frequest = pair;
        }
        if (pair[1] == param) {
          freceive = pair;
        }
      });

      if(frequest[0] == freceive[1] && frequest[1] == freceive[0]) {
        
        room.followchat_pair.push([sender_player.token, frequest[0]])
        const a = new CommandPacket("sessionset");
        a.addCommand("follow_chat", frequest);
        sender_player.socket.send(a.serialize());
        //Originally in chat. could follow.
    }
    break;
  }
}

function analyse_login_command(packet, cmd, param) {
  const loginData = param;
  switch (cmd) {
      case 'login':
          try {
          
          flaskClient.login(loginData["username"], loginData["password"]).then((token)=>{
            console.log(loginData["username"], "login success:", token);
            set_online(packet.sender_socket, token);
          }).catch((err)=>{
            console.log(err);
            console.log(loginData["username"], "login failed.");
            const a = new CommandPacket("login");
            a.addCommand("failed","密码不匹配");
            packet.sender_socket.send(a.serialize());
          })

          } catch (e) {
              console.log("error parsing direct message JSON", e);
          }
          break;
      case 'token':
          flaskClient.quickLogin(param).then((token)=>{
            console.log(param["username"], "login success:", token);
            set_online(packet.sender_socket, token);
          }).catch((err)=>{
            console.log(err);
            const a = new CommandPacket("login");
            a.addCommand("failed","认证信息无效或已过期");
            packet.sender_socket.send(a.serialize());
          })
          break;
      default:
          console.log("default", cmd, param);
  }
  
};



// a new client connects
wss.on("connection", function connection(ws, req) {
  console.log("new connection found");

  ws.isAlive = true;
  ws.missedPings = 0;
  ws.pingStart = new Date().getTime();
  ws.userId = '(未登录)';
  ws.username = '(未登录)';

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
      //console.log(packet);
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
      //console.log("packet receive: ", packet.serialize());
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
            // similar to broadcast, but exclude host
            routeTo(packet.session, packet, Router.PLAYER | Router.WATCHER);
          }else{
            console.log("error: a sync package not from ST.");
          }

          break;

        case "require":
          if(!channels[packet.session]) return;
          routeTo(packet.session, packet, Router.TARGET);
          break;
        case "request":
          if(!channels[packet.session]) return;
          routeTo(packet.session, packet, Router.HOST);
          break;
        case "direct":
          if(!channels[packet.session]) return;
          routeTo(packet.session, packet, Router.TARGET);
          break;
        case "boardcast":
          if(!channels[packet.session]) return;
          routeTo(packet.session, packet, Router.HOST | Router.PLAYER | Router.WATCHER);
          break;
        default:
          console.log("Unknown packet type:", packet.header);
          break;
      }
  });

  // start ping pong
  ws.ping(noop);
  ws.on("pong", heartbeat);

  ws.on('close', () => {
    console.log("ws disconnected by client.");
    mark_connection_lost(ws);
    ws.isAlive = false;
  });
  // handle message
  }
);

function noop() {}

// calculate latency on heartbeat
function heartbeat() {
  this.latency = Math.round((new Date().getTime() - this.pingStart) / 2);
  this.counter = 0;

  // 如果之前因为网络不稳被标记为离线，现在心跳恢复了，重新标记为在线
  if (this.isAlive === false && this.missedPings > 0) {
    restore_connection(this);
  }

  this.isAlive = true;
  this.missedPings = 0;
}

// start ping interval timer
const interval = setInterval(
  function ping() {
    wss.clients.forEach(function each(ws) {
      if (ws.isAlive === false) {
        ws.missedPings++; // 增加丢失计数
        
        if (ws.missedPings >= MAX_MISSED_PINGS) {
          // 连续丢失多次 ping 才断开连接
          console.log(`client ${ws.username} missed ${ws.missedPings} pings, terminating.`);
          mark_connection_lost(ws);
          return ws.terminate();
        } else if (ws.missedPings >= 2){
          // 暂时丢失，保持连接但标记离线
          console.log(`client ${ws.username} missed ${ws.missedPings} pings, marking offline but keeping connection.`);
          mark_connection_lost(ws);
          return; // 不断开连接
        }
      }
      ws.isAlive = false;
      ws.pingStart = new Date().getTime();
      ws.ping(noop);
    });
    // clean up empty channels
    if (channels.length > 0) {
      for (const channel in channels) {
        if (
          !channels[channel].players.length ||
          !channels[channel].players.some(
            (player) => {
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

function mark_connection_lost(ws) {
  for (const channel in channels) {
    if (channels[channel].host['socket'].userId == ws.userId) {

      room = channels[channel];
      player = room.host;

      console.log("storyteller disconnected:", ws.userId);

      const chatlost = new CommandPacket("request");
      chatlost.addCommand("chat/leaveChatChannel", {userId: player.token});
      channels[channel].host['socket'].send(chatlost.serialize());

      const packet = new CommandPacket("request");
      packet.addCommand("players/update", {player: player.token, property: 'isOnline', value: false});
      channels[channel].host['socket'].send(packet.serialize());

      if (ws.missedPings >= MAX_MISSED_PINGS) {
        ws.terminate();
        room.paused = true;
        const p = new CommandPacket("sessionset", channel);
        p.addCommand("pause", true);
        routeTo(channel, p, Router.ALL);
      }

      return;
    }

    channels[channel].players.forEach((player)=>{
      if (player['socket'].userId == ws.userId) {
        console.log("player disconnected:", player.token);

        const chatlost = new CommandPacket("request");
        chatlost.addCommand("chat/leaveChatChannel", {userId: player.token});
        channels[channel].host['socket'].send(chatlost.serialize());

        const packet = new CommandPacket("request");
        packet.addCommand("players/update", {player: player.token, property: 'isOnline', value: false});
        channels[channel].host['socket'].send(packet.serialize());
      }
    })
  }
}

function restore_connection(ws) {
  const token = ws.userId;
  if (!token || token === '(未登录)') return;

  const player_info = online_players[token];
  if (!player_info) return;

  console.log(`Restoring connection for ${player_info.username} after temporary network instability`);

  for (const channel in channels) {
    if (channels[channel].host['token'] == token) {
      room = channels[channel];

      // 更新 socket 引用
      room.host.socket = ws;
      room.host.username = player_info.username;

      const packet = new CommandPacket("request");
      packet.addCommand("players/update", {player: token, property: 'isOnline', value: true});
      channels[channel].host['socket'].send(packet.serialize());

      // 如果之前因为掉线暂停了游戏，恢复游戏
      if (room.paused) {
        room.paused = false;
        const p = new CommandPacket("sessionset", channel);
        p.addCommand("pause", false);
        routeTo(channel, p, Router.ALL);

        // clean seats of players who left during pause.
        let require_command = new CommandPacket("require", channel);
        for (let token of room.pause_leave) {
          require_command.addCommand("clean_seat", token);
        }
        room.host.socket.send(require_command.serialize());
        room.pause_leave = [];
      }

      return;
    }

    channels[channel].players.forEach((player)=>{
      if (player['token'] == token) {
        // 更新 socket 引用
        player.socket = ws;
        player.username = player_info.username;

        const packet = new CommandPacket("request");
        packet.addCommand("players/update", {player: token, property: 'isOnline', value: true});
        channels[channel].host['socket'].send(packet.serialize());
      }
    });

    channels[channel].watchers.forEach((player)=>{
      if (player['token'] == token) {
        // 更新 socket 引用
        player.socket = ws;
        player.username = player_info.username;
      }
    });
  }
}
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
