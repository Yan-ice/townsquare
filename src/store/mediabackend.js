import io from "socket.io-client";
import * as mediasoupClient from 'mediasoup-client';
import store from "@/store";

class MediasoupRoom {
  constructor() {
    this.socket = null;
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.joined = false;

    this.roomId = null;
    this.userId = null;

    this.stream = null;        // 本地音频流
    this.producer = null;      // 发送的producer

    // 音量检测相关
    this.audioContext = null;
    this.analyser = null;
    this.microphoneSource = null;
    this.volume = 0;           // 实时音量 0~1
    this.loud_keep = 0;
    this.volumeThreshold = 0.1;
    this.volumeCallback = this._volumeCallback.bind(this);
    this.volumeMonitorId = null;
  }

  _volumeCallback(loud) {
    if(store.state.loginbackend.isSpeaking != loud) {
      if(loud) {
        store.commit("loginbackend/setPlayerIsSpeaking", 
        loud
        );
        this.loud_keep = 60;
      }
    }
    if(loud && this.loud_keep > 0) {
      this.loud_keep--;
      if(this.loud_keep == 0){
        store.commit("loginbackend/setPlayerIsSpeaking", 
        loud
        );
        this.loud_keep = 60;
      }
    }
  }

  async promise_request(request, params) {
    return new Promise((resolve) => {
      this.socket.emit(request, params, resolve);
    });
  }

  async joinRoom(roomId, userId) {
    if (this.joined) {
      console.warn("Already joined");
      return;
    }
    this.roomId = roomId;
    this.userId = userId;
    this.serverURL = store.state.loginbackend.vocalServer;

    this.socket = io(this.serverURL, { timeout: 5000, reconnection: false });

    this.device = new mediasoupClient.Device();

    this.socket.on("newProducer", ({ producerId }) => {
      this.consume(producerId);
    });
    this.socket.on("connect_error", () => {
      alert("无法连接至语音服务器：状态异常。")
      this.socket = null;
      this.device = null;
      this.joined = false;
      this.sendTransport = null;
      this.recvTransport = null;
    });

    this.socket.on("disconnect", (reason) => {
      console.warn("连接断开", reason);
      this.socket = null;
      this.device = null;
      this.joined = false;
      this.sendTransport = null;
      this.recvTransport = null;
    });

    const {
      routerRtpCapabilities,
      sendTransportOptions,
      recvTransportOptions,
    } = await this.promise_request("initializeTalk", { roomId, userId });

    await this.device.load({ routerRtpCapabilities });

    this.sendTransport = this.device.createSendTransport(sendTransportOptions);
    this.recvTransport = this.device.createRecvTransport(recvTransportOptions);

    // 连接 sendTransport
    this.sendTransport.on("connect", ({ dtlsParameters }, callback) => {
      this.socket.emit("transport-connect", { transportId: this.sendTransport.id, dtlsParameters });
      callback();
    });
    // 连接 recvTransport
    this.recvTransport.on("connect", ({ dtlsParameters }, callback) => {
      this.socket.emit("transport-connect", { transportId: this.recvTransport.id, dtlsParameters });
      callback();
    });

    // produce 事件
    this.sendTransport.on("produce", ({ kind, rtpParameters }, callback) => {
      this.socket.emit("produce", {
        transportId: this.sendTransport.id,
        kind,
        rtpParameters,
      }, ({ id }) => {
        callback({ id });
      });
    });

    const { existingProducers } = await this.promise_request("startTalk", {
      roomId,
      rtpCapabilities: this.device.rtpCapabilities,
    });

    // 获取音频流并produce
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const track = this.stream.getAudioTracks()[0];
    this.producer = await this.sendTransport.produce({ track });

    // 启动音量检测
    this.startVolumeMonitor(this.stream);

    // 消费其他producer
    for (const producerId of existingProducers) {
      this.consume(producerId);
    }

    this.joined = true;
  }

  async consume(producerId) {
    this.socket.emit("consume", {
      producerId,
      rtpCapabilities: this.device.rtpCapabilities
    }, async (consumerParameters) => {
      if (consumerParameters.error) {
        console.warn("consume error:", consumerParameters.error);
        return;
      }
      const consumer = await this.recvTransport.consume({
        id: consumerParameters.id,
        producerId: consumerParameters.producerId,
        kind: consumerParameters.kind,
        rtpParameters: consumerParameters.rtpParameters,
      });
      const remoteStream = new MediaStream();
      remoteStream.addTrack(consumer.track);

      // 这里可自行设计播放方案，比如触发事件或调用回调
      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.autoplay = true;
      audio.play().catch(e => console.warn("Audio play error:", e));
    });
  }

  async leaveRoom() {
    if (!this.joined) return;

    if (this.producer) {
      await this.producer.close();
      this.producer = null;
    }
    if (this.sendTransport) {
      this.sendTransport.close();
      this.sendTransport = null;
    }
    if (this.recvTransport) {
      this.recvTransport.close();
      this.recvTransport = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.stopVolumeMonitor();

    this.joined = false;
    this.roomId = null;
    this.userId = null;
  }

  mute() {
    if (!this.stream) return;
    this.stream.getAudioTracks().forEach(track => track.enabled = false);
  }

  unmute() {
    if (!this.stream) return;
    this.stream.getAudioTracks().forEach(track => track.enabled = true);
  }

  startVolumeMonitor(stream) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    this.microphoneSource = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;

    this.microphoneSource.connect(this.analyser);

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const updateVolume = () => {
      this.analyser.getByteFrequencyData(dataArray);
      let values = 0;
      for (let i = 0; i < dataArray.length; i++) {
        values += dataArray[i];
      }
      const average = values / dataArray.length;
      this.volume = average / 255;

      if (this.volumeCallback) {
        this.volumeCallback(this.volume >= this.volumeThreshold);
      }
      this.volumeMonitorId = requestAnimationFrame(updateVolume);
    };

    updateVolume();
  }

  stopVolumeMonitor() {
    if (this.volumeMonitorId) {
      cancelAnimationFrame(this.volumeMonitorId);
      this.volumeMonitorId = null;
    }
    if (this.microphoneSource) {
      this.microphoneSource.disconnect();
      this.microphoneSource = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

const mediasoupRoom = new MediasoupRoom();

export default mediasoupRoom;
