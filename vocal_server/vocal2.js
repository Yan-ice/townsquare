// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mediasoup = require('mediasoup');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const CODECS = {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2,
          };

const rooms = new Map(); // roomId => { router, peers: Map<socketId, peer> }

let worker;

(async () => {
  worker = await mediasoup.createWorker();

io.on("connection", (socket) => {

  socket.on("initializeTalk", async ({roomId}, callback) => {
    console.log('Client initialize:', socket.id);
    if (!rooms.has(roomId)) {
      const router = await worker.createRouter({ mediaCodecs: [ CODECS ] });
      rooms.set(roomId, { router, peers: new Map(), producers: [] });
    }
    const room = rooms.get(roomId);

    // 创建 send 和 recv transport
    const createTransport = async () => {
      return await room.router.createWebRtcTransport({
        listenIps: [{ ip: "127.0.0.1" }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });
    };
    const sendTransport = await createTransport();
    const recvTransport = await createTransport();

    const peer = {
      id: socket.id,
      transports: { send: sendTransport, recv: recvTransport },
      producers: [],
      consumers: []
    };

    room.peers.set(socket.id, peer);

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

  socket.on("startTalk", async ({roomId, rtpCapabilities}, callback) => {
    // 创建房间与 Router（如需）
    console.log('Client startTalk:', socket.id);

    const room = rooms.get(roomId);

    const peer = room.peers.get(socket.id);

    peer.rtpCapabilities = rtpCapabilities;

    // 当客户端调用 sendTransport.produce 时，服务端创建 Producer
    socket.on("produce", async ({ transportId, kind, rtpParameters }, callback) => {
      const transport = peer.transports.send;
      const producer = await transport.produce({ kind, rtpParameters });
      producer.on('transportclose', () => console.log('Producer closed'));
        producer.on('trackended', () => console.log('Producer track ended'));

      console.log('Producer created, id:', producer.id, 'kind:', producer.kind);

      peer.producers.push(producer);
      room.producers.push(producer);

      // 通知其他人有新 producer（可选）
      for (let [otherId, otherPeer] of room.peers.entries()) {
        if (otherId !== socket.id) {
          io.to(otherId).emit("newProducer", { producerId: producer.id, socketId: socket.id });
        }
      }

      callback({ id: producer.id });
    });

    // 客户端发送 consume 请求时，立即创建 consumer
    socket.on("consume", async ({ producerId }, callback) => {
      const producer = room.producers.find(p => p.id === producerId);
      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        console.log("cannot consume.");
        return callback({ error: "Can't consume" });
      }
      const consumer = await peer.transports.recv.consume({
        producerId,
        rtpCapabilities,
        paused: false,
      });
      console.log(producerId, "is consumed by", consumer.id);
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
      existingProducers: room.producers.map(p => ({ producerId: p.id })),
    });
  });

  socket.on('disconnect', () => {
        // 清理 peer 相关资源
        for (const producer of peer.producers) producer.close();
        for (const consumer of peer.consumers) consumer.close();
        for (const transport of Object.values(peer.transports)) transport.close();

        room.peers.delete(socket.id);
        if (room.peers.size === 0) {
          room.router.close();
          rooms.delete(roomId);
        }
        console.log('Client disconnected:', socket.id);
    });
});

  server.listen(3000, () => {
    console.log('Server running on port 3000');
  });
})();
