<template>
  <div>
    <h3>Mediasoup Vue2 Audio Room</h3>
    <div>
      <input v-model="roomId" placeholder="Enter room ID" />
      <button @click="joinRoom" :disabled="joined">Join Room</button>
    </div>
    <div v-if="joined">
      <p>Joined room: {{ roomId }}</p>
    </div>
    <div>
      <h4>Remote Audios:</h4>
      <div v-for="(audioObj, idx) in remoteAudios" :key="idx">
        <audio :ref="'remoteAudio' + idx" autoplay controls></audio>
      </div>
    </div>
  </div>
</template>

<script>
import io from "socket.io-client";
import * as mediasoupClient from 'mediasoup-client';

export default {
  name: "MediasoupRoom",
  data() {
    return {
      socket: null,
      device: null,
      sendTransport: null,
      recvTransport: null,
      producers: [],
      consumers: [],
      roomId: "",
      joined: false,
      producing: false,
      remoteAudios: [],
    };
  },
  methods: {
    async promise_request(socket, request, params) {
      return new Promise((resolve) => {
          socket.emit(
            request, params, resolve
          );
      });
    },
    async consume(producerId) {
      this.socket.emit("consume", {
            producerId, rtpCapabilities: this.device.rtpCapabilities
          }, async (consumerParameters) => {
            const consumer = await this.recvTransport.consume({
              id: consumerParameters.id,
              producerId: consumerParameters.producerId,
              kind: consumerParameters.kind,
              rtpParameters: consumerParameters.rtpParameters,
            });

            consumer.track.onended = () => console.warn("consumer track ended");
            consumer.on("transportclose", () => console.warn("consumer transport closed"));
            
            console.log('consumer.kind:', consumer.kind); // 应该是 'audio'
            console.log('consumer.track.enabled:', consumer.track.enabled);
            console.log('consumer.track.readyState:', consumer.track.readyState); // 应该是 'live'

            const remoteStream = new MediaStream();
            remoteStream.addTrack(consumer.track);

            // 播放 remoteStream 到 audio 标签
            const audio = new Audio();
            audio.srcObject = remoteStream;
            audio.autoplay = true;
            audio.play().catch(err => console.warn("play error", err));

            console.log("consumed. enabled",consumer.track.enabled);
          });
    },
    async joinRoom() {
      if (!this.roomId) {
        alert("请输入房间ID");
        return;
      }
      this.socket = io("http://localhost:3000");
      this.device = new mediasoupClient.Device();

      this.socket.on("newProducer", ({ producerId }) => {
        this.consume(producerId);
      });

      const {
        routerRtpCapabilities,
        sendTransportOptions,
        recvTransportOptions,
      } = await this.promise_request(this.socket, "initializeTalk",
        {roomId: this.roomId}
      );
      this.joined = true;
      await this.device.load({ routerRtpCapabilities: routerRtpCapabilities });
        // 创建 transports
        this.sendTransport = this.device.createSendTransport(sendTransportOptions);
        this.recvTransport = this.device.createRecvTransport(recvTransportOptions);

        // transport connect (自动握手)
        this.sendTransport.on("connect", ({ dtlsParameters }, callback) => {
          this.socket.emit("transport-connect", {
            transportId: this.sendTransport.id,
            dtlsParameters,
          });
          callback();
        });

        this.recvTransport.on("connect", ({ dtlsParameters }, callback) => {
          this.socket.emit("transport-connect", {
            transportId: this.recvTransport.id,
            dtlsParameters,
          });
          callback();
        });

        // produce 轨道
        this.sendTransport.on("produce", ({ kind, rtpParameters }, callback) => {
          this.socket.emit("produce", {
            transportId: this.sendTransport.id,
            kind,
            rtpParameters,
          }, ({ id }) => {
            callback({ id });
          });
        });
      
      const {
        existingProducers
      } = await this.promise_request(this.socket, "startTalk",
        {roomId: this.roomId, rtpCapabilities: this.device.rtpCapabilities}
      );

        // 获取音频轨，立即 produce
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const track = stream.getAudioTracks()[0];
        console.log("track", track);
        await this.sendTransport.produce({ track });

        // 立即 consume 所有其他 producer
        for (let { producerId } of existingProducers) {
          this.consume(producerId);
        }
    },
  },
};
</script>
