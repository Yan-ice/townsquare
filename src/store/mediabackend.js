import io from "socket.io-client";
import * as mediasoupClient from 'mediasoup-client';

class MediasoupRoom {
  constructor() {
    this.socket = null;
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.joined = false;

    this.roomId = null;
    this.userId = null;
    this.serverURL = null;

    this.stream = null;        // 本地音频流
    this.producer = null;      // 发送的producer

    this.isMute = true;
    this.isNetworkPoor = false;

    this.currentChannel = null;

    // 音量检测相关
    this.audioContext = null;
    this.analyser = null;
    this.microphoneSource = null;
    this.volume = 0;           // 实时音量 0~1
    this.loud_keep = 0;
    this.volumeThreshold = 0.09;
    this.volumeCallback = this._volumeCallback.bind(this);
    this.volumeMonitorId = null;

    this.updateCallback = null;
  }

  setUpdateCallback(func) {
    this.updateCallback = func;
  }

  setMute(mute) {

    if (!this.stream) return;
    this.isMute = mute;

    this.stream.getAudioTracks().forEach(track => track.enabled = (!this.isMute && !this.isNetworkPoor));

    if(this.updateCallback){
      this.updateCallback();
    }
  }

  setNetworkPoor(poor) {
    this.isNetworkPoor = poor;
    if (!this.stream) return;
    this.stream.getAudioTracks().forEach(track => track.enabled = (!this.isMute && !this.isNetworkPoor));

    if(this.updateCallback){
      this.updateCallback();
    }
  }

  startNetworkMonitor() {
    this.networkMonitorId = setInterval(async () => {
      if (!this.producer) return;
  
      try {
        const stats = await this.producer.getStats();
  
        let isBadNetwork = false;
        let analysis = {}; // 用于 log 打印和传递上下文
  
        for (const [id, report] of stats.entries()) {
          // 发送端 RTP 状态
          if (report.type === "outbound-rtp" && report.kind === "audio") {
            const {
              packetsSent = 0,
              retransmittedPacketsSent = 0,
              nackCount = 0,
              targetBitrate = 24000
            } = report;
  
            const lossRate = packetsSent > 0
              ? retransmittedPacketsSent / packetsSent
              : 0;
  
            analysis = {
              ...analysis,
              lossRate,
              nackCount,
              targetBitrate
            };
  
            if (lossRate > 0.1 || nackCount > 5 || targetBitrate < 14000) {
              isBadNetwork = true;
            }
          }
  
          // 接收端反馈（remote-inbound-rtp）
          if (report.type === "remote-inbound-rtp" && report.kind === "audio") {
            const {
              fractionLost = 0,
              jitter = 0,
              totalRoundTripTime = 0,
              roundTripTimeMeasurements = 0
            } = report;
  
            const rtt = roundTripTimeMeasurements > 0
              ? totalRoundTripTime / roundTripTimeMeasurements
              : 0;
  
            analysis = {
              ...analysis,
              fractionLost,
              jitter,
              rtt
            };
  
            if (fractionLost > 0.2 || jitter > 0.08 || rtt > 0.5) {
              isBadNetwork = true;
            }
          }
        }
  
        this._handleNetworkQuality(isBadNetwork, analysis);
        //console.log("网络状态监测:", isBadNetwork, analysis);
      } catch (err) {
        console.warn("getStats error:", err);
      }
    }, 1000);
  }
  
  
  stopNetworkMonitor() {
    if (this.networkMonitorId) {
      clearInterval(this.networkMonitorId);
      this.networkMonitorId = null;
    }
  }
  
  _handleNetworkQuality(isBad, stats) {
    if (isBad) {
      if (!this.isNetworkPoor) {
        console.warn("网络状态差:", stats);
        this.setNetworkPoor(true);
      }
    } else {
      if (this.isNetworkPoor) {
        console.log("网络恢复正常");
        this.setNetworkPoor(false);
      }
    }
  }

  
  _volumeCallback(loud) {
    if(loud) {
      if(this.loud_keep == 0) {
        this.loud_keep = 60;
          if(this.updateCallback){
            this.updateCallback();
          }
      }
      this.loud_keep = 60;
    }
    
    if(this.loud_keep > 0) {
      this.loud_keep--;
      if(this.loud_keep == 0){
          if(this.updateCallback){
            this.updateCallback();
          }
      }
    }
  }

  async promise_request(request, params) {
    return new Promise((resolve) => {
      this.socket.emit(request, params, resolve);
    });
  }

  async joinRoom(roomId, userId, serverURL) {
    if (this.joined) {
      console.warn("Already joined");
      return;
    }

    if(!roomId || !userId){
      my_alert("错误：客户端信息不同步! 建议刷新网页。");
      return;
    }

    this.roomId = roomId;
    this.userId = userId;

    // 获取音频流并produce
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log("开始请求麦克风权限...");
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("麦克风权限请求成功，获得音频流:", this.stream);
      } else {
        my_alert("不支持麦克风, 或未通过安全环境。");
        console.error("不支持 navigator.mediaDevices.getUserMedia");
        return;
      }
    } catch (err) {
      my_alert("错误：无法开启麦克风！请确认麦克风是否被其他软件占用。");
      console.error(`获取麦克风权限失败: ${err} - ${err.message}`);
      return;
    }

    const tracks = this.stream.getAudioTracks();
    if(tracks.length == 0) {
      my_alert("未找到麦克风设备, 已自动关闭麦克风。你可以在菜单尝试重新打开它。");
      return;
    }
          
    // 启动音量检测
    this.startVolumeMonitor(this.stream);

    const track = tracks[0];

    track.addEventListener('ended', () => {
        my_alert('麦克风设备断开, 已自动关闭麦克风。你可以在菜单尝试重新打开它。');
        this.leaveRoom();
    });

    this.serverURL = serverURL;

    this.socket = io(this.serverURL, { timeout: 10000, reconnection: false });

    this.device = new mediasoupClient.Device();

    this.socket.on("newUser", ({ userId }) => {
      this.consume(userId);
    });

    this.socket.on("connect_error", () => {
      my_alert("无法连接至语音服务器。");
      this.socket = null;
      this.device = null;
      this.joined = false;
      this.roomId = '';
      this.userId = '';
      this.sendTransport = null;
      this.recvTransport = null;
      this.currentChannel = null;
    });

    this.socket.on("disconnect", () => {
      this.socket = null;
      this.device = null;
      this.joined = false;
      this.sendTransport = null;
      this.recvTransport = null;
      this.currentChannel = null;
    });

    const {
      routerRtpCapabilities,
      sendTransportOptions,
      recvTransportOptions,
    } = await this.promise_request("initializeTalk", { roomId, userId, isWatch: false });

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

    const { existingUsers } = await this.promise_request("startTalk", {
      roomId,
      rtpCapabilities: this.device.rtpCapabilities,
    });

    // 限制最大码率
    this.producer = await this.sendTransport.produce({
      track,
      encodings: [
        {
          maxBitrate: 24000, // 限制最大码率为 24kbps
        },
      ],
      codecOptions: {
        opusDtx: true,      // ✅ 启用 DTX（静音时不发送）
        opusStereo: false,  // 可选：单声道，减少带宽
      },
    });

    this.startNetworkMonitor();

    // 消费其他producer
    for (const userId of existingUsers) {
      this.consume(userId);
    }

    this.joined = true;
    this.setMute(true);
    
  }

  async watchRoom(roomId, userId, serverURL) {
    if (this.joined) {
      console.warn("Already joined");
      return;
    }

    if(!roomId || !userId){
      my_alert("错误：客户端信息不同步! 建议刷新网页。");
      return;
    }

    this.roomId = roomId;
    this.userId = userId;

    this.serverURL = serverURL;

    this.socket = io(this.serverURL, { timeout: 10000, reconnection: false });

    this.device = new mediasoupClient.Device();

    this.socket.on("newUser", ({ userId }) => {
      this.consume(userId);
    });

    this.socket.on("connect_error", () => {
      my_alert("无法连接至语音服务器。");
      this.socket = null;
      this.device = null;
      this.joined = false;
      this.roomId = '';
      this.userId = '';
      this.sendTransport = null;
      this.recvTransport = null;
      this.currentChannel = null;
    });

    this.socket.on("disconnect", () => {
      this.socket = null;
      this.device = null;
      this.joined = false;
      this.sendTransport = null;
      this.recvTransport = null;
      this.currentChannel = null;
    });

    const {
      routerRtpCapabilities,
      sendTransportOptions,
      recvTransportOptions,
    } = await this.promise_request("initializeTalk", { roomId, userId, isWatch: true });

    await this.device.load({ routerRtpCapabilities });

    //this.sendTransport = this.device.createSendTransport(sendTransportOptions);
    this.recvTransport = this.device.createRecvTransport(recvTransportOptions);

    // 连接 recvTransport
    this.recvTransport.on("connect", ({ dtlsParameters }, callback) => {
      this.socket.emit("transport-connect", { transportId: this.recvTransport.id, dtlsParameters });
      callback();
    });

    const { existingUsers } = await this.promise_request("startTalk", {
      roomId,
      rtpCapabilities: this.device.rtpCapabilities,
    });

    this.startNetworkMonitor();

    // 消费其他producer
    for (const userId of existingUsers) {
      this.consume(userId);
    }

    this.joined = true;
    this.setMute(true);
    
  }

  async consume(targetuserId) {
    this.socket.emit("consume", {
      targetuserId,
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

  async intoChannel(target_channel) {
    if(!this.socket) return;
    if(this.currentChannel == target_channel){
      return;
    }
    this.currentChannel = target_channel;
    this.socket.emit("into_channel", {
      target_channel
    }, async () =>{
      //Not implemented yet.
    });
  }

  async leaveChannel() {
    if(!this.socket) return;
    if(!this.currentChannel){
      return;
    }
    this.currentChannel = null;
    this.socket.emit("leave_channel", {
      
    }, async () =>{
      //Not implemented yet.
    });
  }

  async leaveRoom() {
    
    this.stopVolumeMonitor();

    this.stopNetworkMonitor();

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

    this.joined = false;

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
      if(this.analyser) {
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
      }
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

// const mediasoupRoom = new MediasoupRoom();

// export default mediasoupRoom;


export default (store) => {
  // setup
  const soup = new MediasoupRoom(store);

  soup.setUpdateCallback(() =>{
      store.commit("chat/setNetworkPoor", soup.isNetworkPoor);
      store.commit("chat/setPlayerIsSpeaking", soup.loud_keep > 0);
    }
  );
  
  // listen to mutations
  store.subscribe(({ type, payload }, state) => {
    switch (type) {
      case "chat/joinRoom":
        soup.joinRoom(payload, state.loginbackend.playerId, state.loginbackend.vocalServer);
        soup.setMute(state.chat.is_mute);
        break;
      case "chat/leaveRoom":
        soup.leaveRoom();
        break;
      case "chat/processChatChannel":
      case "chat/applyChatChannel":
      case "chat/leaveChatChannel":
        const openPrivateChatModal = () => {
          if (!store.state.modals.privateChat) {
            store.commit("toggleModal", "privateChat");
          }
        };
        // 检查是否在申请列表
        for (const owner in state.chat.chatAppliers) {
          const appliers = state.chat.chatAppliers[owner];
          if (appliers.includes(state.loginbackend.playerId)) {
            openPrivateChatModal();
            return;
          }
        }

        // 检查是否在房间成员列表
        for (const owner in state.chat.chatRooms) {
          const members = state.chat.chatRooms[owner];
          if (members.includes(state.loginbackend.playerId)) {
            openPrivateChatModal();
            soup.intoChannel(owner);
            return;
          }
        }
        soup.leaveChannel();
        break;
      case "chat/toggleMute":    
      case "chat/setMute":
        soup.setMute(state.chat.is_mute);
        break;
    } 
  });

};
