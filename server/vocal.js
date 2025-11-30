// server.js
const fs = require("fs");
const express = require('express');
const https = require('https');
const socketIO = require('socket.io');
const mediasoup = require('mediasoup');

const app = express();

const options = {
  key: fs.readFileSync('/home/ubuntu/cert/privkey.pem'),
  cert: fs.readFileSync('/home/ubuntu/cert/cert.pem'),
};

const server = https.createServer(options, app);

const io = socketIO(server, {
  cors: {
    origin: "*", //TODO: * is dangerous.
    methods: ["GET", "POST"],
    credentials: true
  }
});

const RtcOption = {
        listenIps: [
          { 
            ip: "0.0.0.0",
            announcedIp: '111.229.112.80', 
          }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      }

const CODECS = {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2,
          };

const rooms = new Map(); 
// roomId => 
// { router, users: Map{userId, peers}, prepares: Map{userId, peers}}

let worker;

(async () => {
  worker = await mediasoup.createWorker();

function closeConnection(io, roomId, userId) {
    const room = rooms.get(roomId);
    if(room) {
        const peer = room.users.get(userId) ? room.users.get(userId) : room.prepares.get(userId);
        if(peer) {
            
            // io.to(peer.id).emit("closedByRemote");
            if(peer.producer) peer.producer.close();
            for (const consumer of peer.consumers) consumer.close();
            for (const transport of Object.values(peer.transports)) transport.close();

            room.users.forEach(otherPeer => {
              if (otherPeer.id !== peer.id) {
                otherPeer.consumers = otherPeer.consumers.filter(consumer => {
                    if (consumer.producerId === peer.producer?.id) {
                        consumer.close(); // 关闭关联的Consumer
                        return false; // 从数组中移除
                    }
                    return true;
                });
              }
            }
            );
            room.users.delete(userId);
            room.prepares.delete(userId);
            peer.socket.disconnect();
            console.log('Client disconnected:', userId);
        }
    }
}

function updatePrivateState(roomId) {
  const room = rooms.get(roomId);
  channels = new Map();
  if(room) {
    room.users.forEach((user) => {
      const channel = user.privateTarget;
      if(!channels.contains(channel)){
        channels.set(channel, []);
      }
      channels[channel].push(user.userId);
    })
  }

  console.log("new room state:");
  channels.forEach((channel)=>{
    //for all user in channel, enable its consumer to all members.
    channel.forEach((userId) => {
      peer = room.users.get(userId);
      console.log("checking user ", usedId);
      console.log("his channel:", channel);
      peer.consumers.forEach(consumer => {
        console.log("  consumer target = ", consumer.target, channel.contains(consumer.target));
        if(consumer.target != peer.userId && channel.contains(consumer.target)) {
          consumer.resume();
        }else{
          consumer.pause();  // 关闭self的Consumer
        }
      });
    })
  });
}
function intoPrivate(roomId, userId, channelId) {
    const room = rooms.get(roomId);
    if(room) {
      const peer = room.users.get(userId);
      peer.privateTarget = channelId;
      updatePrivateState(roomId);
    }
}
function leavePrivate(roomId, userId) {
  const room = rooms.get(roomId);
  if(room) {
    const peer = room.users.get(userId);
    peer.privateTarget = '__default__';
    updatePrivateState(roomId);
  }
}

function findProducerId(roomId, userId) {
  const room = rooms.get(roomId);
  if(room) {
    const peer = room.users.get(userId);
    if(peer && peer.producer) {
      return peer.producer.id;
    }
  }
  return 0
}

io.on("connection", (socket) => {

  socket.on("initializeTalk", async ({roomId, userId, isWatch}, callback) => {
    console.log('Client initialize:', socket.id, roomId, userId);
    

    if (!rooms.has(roomId)) {
      const router = await worker.createRouter({ mediaCodecs: [ CODECS ] });
      rooms.set(roomId, 
        { router, 
          users: new Map(), 
          prepares: new Map()
        } //new room
      );
    }else{
      closeConnection(io, roomId, userId);
    }

    socket.data.userId = userId;
    socket.data.roomId = roomId;

    const room = rooms.get(roomId);

    // 创建 send 和 recv transport
    const createTransport = async () => {
      return await room.router.createWebRtcTransport(RtcOption);
    };
    const sendTransport = await createTransport();
    const recvTransport = await createTransport();

    const peer = {
      id: socket.id,
      userId: userId,
      isWatch: isWatch,
      transports: { send: sendTransport, recv: recvTransport },
      producer: null,
      consumers: [],
      inprivate: false,
      privateTarget: '__default__',
      socket: socket
    };

    room.prepares.set(userId, peer);

    // 当客户端建立 sendTransport 时自动 connect
    socket.on("transport-connect", async ({ transportId, dtlsParameters }) => {
      const transport = [sendTransport, recvTransport].find(t => t.id === transportId);
      if(transport) {
        await transport.connect({ dtlsParameters });
      }
    });

    // 给客户端返回所有初始化信息
    callback({
      routerRtpCapabilities: room.router.rtpCapabilities,
      sendTransportOptions: {
        id: sendTransport.id,
        iceParameters: sendTransport.iceParameters,
        iceCandidates: sendTransport.iceCandidates,
        dtlsParameters: sendTransport.dtlsParameters,
      },
      recvTransportOptions: {
        id: recvTransport.id,
        iceParameters: recvTransport.iceParameters,
        iceCandidates: recvTransport.iceCandidates,
        dtlsParameters: recvTransport.dtlsParameters,
      },
    });
    }
  );

  socket.on("startTalk", async ({rtpCapabilities}, callback) => {

    console.log('Client startTalk:', socket.data.roomId, socket.data.userId);

    const room = rooms.get(socket.data.roomId);
    const prepare_peer = room.prepares.get(socket.data.userId);
    if(!prepare_peer) {
      closeConnection(io, socket.data.roomId, socket.data.userId);
      callback({ id: 0 });
      return;
    }
    prepare_peer.rtpCapabilities = rtpCapabilities;

    if (prepare_peer.isWatch) {
      prepare_peer.producer = null;
      room.users.set(socket.data.userId, prepare_peer);
      room.prepares.delete(socket.data.userId);
    }else{
      // 当客户端调用 sendTransport.produce 时，服务端创建 Producer, 这是玩家或说书人。
      socket.on("produce", async ({ transportId, kind, rtpParameters }, callback) => {

        // 限制最大码率
        if (rtpParameters.encodings && rtpParameters.encodings.length > 0) {
          console.log(rtpParameters.encodings)
          for (const encoding of rtpParameters.encodings) {
            encoding.maxBitrate = 24000; // 24kbps
          }
        } else {
          // 如果没有encodings数组，可以手动创建
          rtpParameters.encodings = [{ maxBitrate: 24000 }];
        }

        const transport = prepare_peer.transports.send;
        const producer = await transport.produce({ kind, rtpParameters });

        prepare_peer.producer = producer;
        console.log('Client has new producer:', socket.data.userId, producer.id);


      room.users.set(socket.data.userId, prepare_peer);
      room.prepares.delete(socket.data.userId);

        // 通知其他人有新 producer（可选）
        for (let [otherId, otherPeer] of room.users.entries()) {
          if (otherId !== socket.data.userId) {
            io.to(otherPeer.id).emit("newUser", { userId: socket.data.userId, socketId: socket.id });
          }
        }

        callback({ id: prepare_peer.producer.id });
      });
    }


    // 客户端发送 consume 请求时，立即创建 consumer[]
    socket.on("consume", async ({ targetuserId }, callback) => {
      console.log(socket.data.userId, "start consume", targetuserId);

      var peer = room.users.get(socket.data.userId);

      if(!peer) {
        console.log("error: ",socket.data.userId,"not prepared.");
        return;
      }

      const producerId = findProducerId(socket.data.roomId, targetuserId);

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        console.log("cannot consume: "+producerId);
        return callback({ error: "Can't consume" });
      }
      const consumer = await peer.transports.recv.consume({
        producerId,
        rtpCapabilities,
        paused: false,
      });

      consumer.target = targetuserId;

      peer.consumers.push(consumer);

      callback({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    });

    socket.on("into_channel", async ({ channel_id }, callback) => {
      const peer = room.users.get(socket.data.userId);
      if(!peer) {
        console.log("error: ",socket.data.userId,"not prepared.");
        return;
      }
      if (channel_id) {
        intoPrivate(socket.data.roomId, socket.data.userId, channel_id);
        console.log(socket.data.userId+" into private room "+channel_id);
      }
      
    });

    socket.on("leave_channel", async ({}, callback) => {
      console.log(socket.data.userId, "leave channel");
      const peer = room.users.get(socket.data.userId);
      if(!peer) {
        console.log("error: ",socket.data.userId,"not prepared.");
        return;
      }
      leavePrivate(socket.data.roomId, socket.data.userId);
      console.log(socket.data.userId+" leave private room.");
    });

    // 给客户端返回所有初始化信息
    callback({
      existingUsers: Array.from(room.users.keys().filter((id)=>{return id!=socket.data.userId;})),
    });
  });

  socket.on('disconnect', () => {
        // 清理 peer 相关资源
        closeConnection(io, socket.data.roomId, socket.data.userId);
        room = rooms[socket.data.roomId];
        if (room && room.users.size === 0) {
          room.router.close();
          rooms.delete(roomId);
        }
    });
});

  server.listen(8082, () => {
    console.log('Server running on port 8082');
  });
})();
