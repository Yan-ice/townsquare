// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mediasoup = require('mediasoup');

const app = express();
const server = http.createServer(app);

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

const rooms = new Map(); // roomId => { router, users: Map{userId, peers} }

let worker;

(async () => {
  worker = await mediasoup.createWorker();

function closeConnection(io, roomId, userId) {
    const room = rooms.get(roomId);
    if(room) {
        const peer = room.users.get(userId);
        if(peer) {
            console.log('Client disconnected:', peer.id);
            io.to(peer.id).emit("closedByRemote");
            peer.producer.close();
            for (const consumer of peer.consumers) consumer.close();
            for (const transport of Object.values(peer.transports)) transport.close();

            room.users.delete(userId);
        }
    }
}

io.on("connection", (socket) => {

  socket.on("initializeTalk", async ({roomId, userId}, callback) => {
    console.log('Client initialize:', socket.id, roomId, userId);

    closeConnection(io, roomId, userId);

    if (!rooms.has(roomId)) {
      const router = await worker.createRouter({ mediaCodecs: [ CODECS ] });
      rooms.set(roomId, { router, users: new Map()});
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
      transports: { send: sendTransport, recv: recvTransport },
      producer: null,
      consumers: []
    };

    room.users.set(userId, peer);

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
    const peer = room.users.get(socket.data.userId);
    peer.rtpCapabilities = rtpCapabilities;

    // 当客户端调用 sendTransport.produce 时，服务端创建 Producer
    socket.on("produce", async ({ transportId, kind, rtpParameters }, callback) => {
      const transport = peer.transports.send;
      const producer = await transport.produce({ kind, rtpParameters });

      peer.producer = producer;
      console.log('Client has new producer:', socket.data.userId, producer.id);

      // 通知其他人有新 producer（可选）
      for (let [otherId, otherPeer] of room.users.entries()) {
        if (otherId !== socket.data.userId) {
          io.to(otherPeer.id).emit("newProducer", { producerId: producer.id, socketId: socket.id });
        }
      }

      callback({ id: producer.id });
    });

    // 客户端发送 consume 请求时，立即创建 consumer
    socket.on("consume", async ({ producerId }, callback) => {
      console.log(socket.data.userId, "want consume", producerId);
      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        console.log("cannot consume.");
        return callback({ error: "Can't consume" });
      }
      const consumer = await peer.transports.recv.consume({
        producerId,
        rtpCapabilities,
        paused: false,
      });
      console.log(consumer.id, "consume", producerId);
      peer.consumers.push(consumer);
      callback({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    });

    // 给客户端返回所有初始化信息
    callback({
      existingProducers: Array.from(room.users.values())
                    .map(peer => peer.producer)
                    .filter(Boolean).map(producer => producer.id),
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
