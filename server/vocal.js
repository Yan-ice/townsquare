// server.js
const fs = require("fs");
const express = require('express');
const https = require('https');
const socketIO = require('socket.io');
const mediasoup = require('mediasoup');

const app = express();

const options = {
  key: fs.readFileSync('./privkey.pem'),
  cert: fs.readFileSync('./cert.pem'),
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
        const peer = room.users.get(userId);
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
                        // io.to(otherPeer.id).emit("consumerClosed", {
                        //     consumerId: consumer.id
                        // });
                        return false; // 从数组中移除
                    }
                    return true;
                });
              }
            }
            );
            room.users.delete(userId);
            peer.socket.disconnect();
            console.log('Client disconnected:', peer.id);
        }
    }
}

function intoPrivate(io, roomId, userId) {
    const room = rooms.get(roomId);
    if(room) {
        const peer = room.users.get(userId);
        if(peer) {
            console.log('Client into Private:', userId);
            peer.consumers.forEach(consumer => {
              consumer.pause();  // 关闭self的Consumer
            });

            room.users.forEach(otherPeer => {
              if (otherPeer.id !== peer.id) {
                otherPeer.consumers.forEach(consumer => {
                    if (consumer.target === userId) {
                        consumer.pause(); // 关闭关联的Consumer
                    }
                });
              }
            }
            );

            peer.inprivate = true;
        }
    }
}

function leavePrivate(io, roomId, userId) {
    const room = rooms.get(roomId);
    if(room) {
        const peer = room.users.get(userId);
        if(peer) {
            peer.inprivate = false;
            console.log('Client leave Private:', peer.id);
            // io.to(peer.id).emit("closedByRemote");
            
            peer.consumers.forEach(consumer => {
              if(!room.users.get(consumer.target).inprivate) {
                consumer.resume();
              }
            });

            room.users.forEach(otherPeer => {
              if (otherPeer.id !== peer.id && !otherPeer.inprivate) {
                otherPeer.consumers.forEach(consumer => {
                    if (consumer.target === userId) {
                        consumer.resume(); // 关闭关联的Consumer
                    }
                });
              }
            }
            );

            peer.inprivate = true;
        }
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

  socket.on("initializeTalk", async ({roomId, userId}, callback) => {
    console.log('Client initialize:', socket.id, roomId, userId);
    

    if (!rooms.has(roomId)) {
      const router = await worker.createRouter({ mediaCodecs: [ CODECS ] });
      rooms.set(roomId, { router, users: new Map(), prepares: new Map()});
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
      transports: { send: sendTransport, recv: recvTransport },
      producer: null,
      consumers: [],
      inprivate: false,
      socket: socket
    };

    room.prepares.set(userId, peer);

    // 当客户端建立 sendTransport 时自动 connect
    socket.on("transport-connect", async ({ transportId, dtlsParameters }) => {
      const transport = [sendTransport, recvTransport].find(t => t.id === transportId);
      await transport.connect({ dtlsParameters });
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
    prepare_peer.rtpCapabilities = rtpCapabilities;

    // 当客户端调用 sendTransport.produce 时，服务端创建 Producer
    socket.on("produce", async ({ transportId, kind, rtpParameters }, callback) => {
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

      callback({ id: producer.id });
    });

    // 客户端发送 consume 请求时，立即创建 consumer[]
    socket.on("consume", async ({ targetuserId }, callback) => {
      console.log(socket.data.userId, "start consume", targetuserId);

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

    socket.on("into_private", async ({ target_user_id }, callback) => {
      intoPrivate(io, socket.data.roomId, socket.data.userId);

      if (target_user_id) {
        console.log(socket.data.userId+" enable connection to "+target_user_id);
        peer.consumers.forEach((consumer)=>
          {
            if(consumer.target == target_user_id) {
              consumer.resume();
            }
          }
        );
        // room.users.get(target_user_id).consumers.forEach((consumer)=>
        //   {
        //     if(consumer.target == socket.data.userId) {
        //       consumer.resume();
        //     }
        //   }
        // );
      }
      
    });

    socket.on("leave_private", async ({}, callback) => {
      console.log(socket.data.userId, "leave private");

      leavePrivate(io, socket.data.roomId, socket.data.userId);
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
