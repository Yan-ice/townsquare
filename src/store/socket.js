import mediasoupRoom from './mediabackend.js';
import axios from "axios";
const CommandPacket = require('./packet.js');

class LiveSession {
  constructor(store) {
    // this._wss = "wss://clocktower1:8080/";
    //this._wss = "ws://localhost:8081/"; // uncomment if using local server with NODE_ENV=development
    this._socket = null;
    this._isSpectator = true;
    this._gamestate = [];
    this._store = store;
    this._pingInterval = 30 * 1000; // 30 seconds between pings
    this._pingTimer = null;
    this._reconnectTimer = null;
    this._players = {}; // map of players connected to a session
    this._pings = {}; // map of player IDs to ping

    this._mdict = false;

    this.loginun = '';      //store for reconnect.
    this.loginpw = '';      //store for reconnect.

    this._setupVisibilityListener();
  }

  _setupVisibilityListener() {
    // 检测页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this._store.state.loginbackend.sessionId) {
        // 页面变为可见且有登录状态时，尝试重连
        this._handlePageVisible();
      }
    });

    // 检测页面焦点变化（移动端切屏）
    window.addEventListener('focus', () => {
      if (this._store.state.loginbackend.sessionId) {
        this._handlePageVisible();
      }
    });

    // 检测网络状态变化
    window.addEventListener('online', () => {
      if (this._store.state.loginbackend.sessionId) {
        this._handlePageVisible();
      }
    });
  }

  _handlePageVisible() {
    // 如果当前没有连接或连接已断开，尝试重连
    if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
      console.log('页面重新可见，尝试重连...');
      this._attemptReconnect();
    }
  }

  _attemptReconnect() {
    if (this._isReconnecting) return;
    
    this._isReconnecting = true;
    this._store.commit("session/setTotalTimer", 0);
    my_alert('尝试重连...');
    
    // 清除之前的重连定时器
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
    }
    
    // 尝试重连
    this._reconnectTimer = setTimeout(async () => {
      this._isReconnecting = false;

      this.login(this.loginun, this.loginpw);

    }, 1000); // 1秒后重连
  }

  /**
   * Open a new session for the passed channel.
   * @param channel
   * @private
   * If usrname is empty, it means login with system me. (me = pwd)
   */
    login(usrname, pwd) {
      this._wss = this._store.state.loginbackend.backendServer;

      this._socket = new WebSocket(
        this._wss + "login",
      );

      this._socket.addEventListener("message", this._handlePacket.bind(this));
      
      console.log("login with",usrname, pwd);

      this.loginun = usrname;
      this.loginpw = pwd;
      //store for reconnect.

      // 设置连接超时（单位：毫秒）
      const timeoutDuration = 10000;
      let timeoutHandle = setTimeout(() => {
          if (this._socket && this._socket.readyState !== WebSocket.OPEN) {
            my_alert("无法连接到服务器。检查你的区服号，或服务器状态异常。");
            this._socket.close();
            this._socket = null;
            this._store.commit("loginbackend/resetServerURL");
          }
      }, timeoutDuration);
        
      const onOpenL = () =>{
        clearTimeout(timeoutHandle); // 连接成功，取消超时计时器

        const cmd = new CommandPacket("login");
        if(usrname != ''){
          cmd.addCommand("login",{
            username: usrname,
            password: pwd,
          });
          
        }else{
          cmd.addCommand("token",pwd);
        }
        this._sendPacket(cmd);
        
      }
      this._socket.onopen = onOpenL.bind(this);

      this._socket.onclose = (err) => {
        this._socket = null;
        clearInterval(this._pingTimer);
        this._pingTimer = null;

        if (err.code !== 1000) {
          // 非正常关闭，尝试重连
          if (this._store.state.loginbackend.sessionId) {
            console.log('连接异常断开，尝试重连...');
            this._attemptReconnect();
          } else {
            // 没有登录状态，清除连接信息
            this._store.commit("loginbackend/setSessionId", '');
            this._store.commit("loginbackend/setPlayerId", '');
            if (err.reason) my_alert(err.reason);
          }
        }
      };

      this._socket.onerror = () => {
        console.log('WebSocket 连接错误');
        // 可选：触发退出登录或提示
        if (!this._store.state.loginbackend.sessionId) {
          my_alert("服务器状态异常。");
        }
      };

    }
  
  /**
   * Send a message through the socket.
   * @param command
   * @param params
   * @private
   */
  _send(command, params) {
    const sessionId = this._store.state.loginbackend.sessionId;
    const senderId = this._store.state.loginbackend.playerId;
    if (this._socket && this._socket.readyState == 1) {
      const packetx = new CommandPacket("boardcast", sessionId);
      packetx.sender = senderId;
      packetx.addCommand(command, params);
      this._sendPacket(packetx);
    }
  }

  /**
   * Send a message directly to a single playerId, if provided.
   * Otherwise broadcast it.
   * @param playerId player ID or "host", optional
   * @param command
   * @param params
   * @private
   */
  _sendDirect(playerId, command, params) {
    if (playerId) {
      const sessionId = this._store.state.loginbackend.sessionId;
      const senderId = this._store.state.loginbackend.playerId;
      if (this._socket && this._socket.readyState == 1) {
        const packetx = new CommandPacket("direct", sessionId);
        packetx.sender = senderId;
        packetx.receiver = playerId;
        packetx.addCommand(command, params);
        this._sendPacket(packetx);
      }
    } else {
      this._send(command, params);
    }
  }

  _handlePacket(rawevt) {
    console.log("raw:", rawevt.data);
    const packet = CommandPacket.deserialize(rawevt.data);
    switch(packet.header) {
      case 'login':
        packet.forEachCommand(this._handleLogin.bind(this));
        return;
      case 'sessionset':
        packet.forEachCommand(this._handleSession.bind(this));
        return;
      case 'require':
        packet.forEachCommand(this._handleRequire.bind(this)); //HOST can require anyone.
        return;
      case 'sync':
        packet.forEachCommand(this._handleSync.bind(this)); //HOST sync commits to all PLAYER through this.
        return;
      case 'request':
        packet.forEachCommand(this._handleRequest.bind(this)); //Anyone can request HOST to commit something through this.
        return;
      default:
        packet.forEachCommand(this._handleMessage.bind(this));
    }
  }

  _handleLogin(packet, command, params){
          switch (command) {
            case "success":  
              this._store.commit("loginbackend/setPlayerId", params['token']);
              this._store.commit("loginbackend/setUsername", params['username']);
              this._store.commit("loginbackend/setCanStoryteller", params['is_storyteller']);
              break;
            case "failed":
              my_alert("登录失败：激活码无效, 或已被其他昵称使用。");
              this._store.commit("loginbackend/logout");
              break;
            case "session_restore":
              this._store.dispatch("loginbackend/joinSession", {sessionId: params, mdict: false});
              //this._store.commit("loginbackend/setSessionId", param);
              break;
          }
        
  }

  async mediaCallback() {
    this._store.commit("loginbackend/setNetworkPoor", mediasoupRoom.isNetworkPoor);
    this._store.commit("loginbackend/setPlayerIsSpeaking", mediasoupRoom.loud_keep > 0);
  }
  async _handleSession(packet, command, params) {
      switch (command) {
        case 'mdict':
          this._mdict = params;
          this._store.commit("loginbackend/setMdict", params);
          break;
        case 'state':
          if(params == 'host') {
            this._isSpectator = false;
            this._store.commit("session/setSpectator", false);
            this._store.commit("session/setWatcher", false);
            this._store.commit("players/update", {player: 100, property: 'id', value: this._store.state.loginbackend.playerId});
            this._store.commit("players/update", {player: 100, property: 'name', value: this._store.state.loginbackend.username});
            this._store.commit("loginbackend/setSessionId", packet.session);
            this.sendGamestate();

            if(this._mdict) {
              my_alert("提示：该房间开启了魔典内置语音。请允许魔典使用麦克风权限。");
              await mediasoupRoom.joinRoom(packet.session, 
                this._store.state.loginbackend.playerId, this._store.state.loginbackend.vocalServer);
              mediasoupRoom.setMute(this._store.state.isMute);
              mediasoupRoom.setUpdateCallback(this.mediaCallback.bind(this));
            }
            
          }else if (params == 'play'){
            this._isSpectator = true;
            this._store.commit("session/setSpectator", true);
            this._store.commit("session/setWatcher", false);
            this._store.commit("loginbackend/setSessionId", packet.session);
            this._sendDirect(
                "host",
                "getGamestate",
                this._store.state.loginbackend.playerId,
              );
            const autocom = new CommandPacket("sessionset");
            autocom.addCommand("autoclaim");
            this._sendPacket(autocom);

            const needlog = new CommandPacket("boardcast");
            needlog.addCommand("retrieveMessageLog");
            this._sendPacket(needlog);

            if(this._mdict) {
              my_alert("提示：该房间开启了魔典内置语音。请允许魔典使用麦克风权限。");
              await mediasoupRoom.joinRoom(packet.session, 
                this._store.state.loginbackend.playerId, this._store.state.loginbackend.vocalServer);
              mediasoupRoom.setMute(this._store.state.isMute);
              mediasoupRoom.setUpdateCallback(this.mediaCallback.bind(this));
            }

          }else if (params == 'watch') {
            this._isSpectator = true;
            this._store.commit("session/setSpectator", true);
            this._store.commit("session/setWatcher", true);
            this._store.commit("loginbackend/setSessionId", packet.session);
            this._sendDirect(
                "host",
                "getGamestate",
                this._store.state.loginbackend.playerId,
            );
            if(this._mdict) {
              await mediasoupRoom.watchRoom(packet.session, 
                this._store.state.loginbackend.playerId, this._store.state.loginbackend.vocalServer);
              mediasoupRoom.setMute(this._store.state.isMute);
              mediasoupRoom.setUpdateCallback(this.mediaCallback.bind(this));
            }
            my_alert("提示：你处于观战模式。如要进行游戏，请退出房间重新进入。");

          }else if (params == 'leave'){
            this._store.commit("loginbackend/setSessionId", '');
            try {
                  await mediasoupRoom.leaveRoom();
              } catch (e) {
                  console.warn("leaveRoom error:", e);
              }
          }
          break;
        case 'reset':
          this._store.commit("players/clear");
          break;
        case 'private_chat':
          if(params) {
            mediasoupRoom.startPrivateChat(params);
            this._store.commit("session/setPrivateChatConnected", true);
          }else{
            mediasoupRoom.stopPrivateChat();
            this._store.commit("session/setPrivateChatConnected", false);
          }
          break;
        case 'follow_chat':
            if(params && params.length >= 2) {
              mediasoupRoom.followPrivateChat(params[0], params[1]);
              this._store.commit("session/setPrivateChatConnected", true);
            }else{
              mediasoupRoom.stopPrivateChat();
              this._store.commit("session/setPrivateChatConnected", false);
            }
            break;
        case 'info':
          my_alert(params);
          break;
      }
  }
  /**
   * Yan_ice: mark.
   * Handle an incoming socket message.
   * @param data
   * @private
   */
  _handleRequire(packet, command, params) {
    switch(command){
      case 'alert':
        my_alert(params);
        break;
      case 'leave_session':
        my_alert(params);
        this._store.dispatch("loginbackend/leaveSession");
        break;
      case 'logout':
        my_alert(params);
        
        this._store.dispatch("loginbackend/logout");
        break;
      case 'prepare_seat': // prepare a seat for user
        {
          const playersls = this._store.state.players.players;
          if(playersls.some((player) => player.id == params.token)) {
            return;
          }

          for (let i = 0; i < playersls.length; i++) {
            const player = playersls[i];
            if (player.id == '') {
              this._store.commit("players/update", {
                player,
                property: "id",
                value: params.token,
              });
              this._store.commit("players/update", {
                player,
                property: "name",
                value: params.username,
              });
              //this._store.commit("players/update_claim");
              return;
            }
          }

          this._store.commit("players/add");
          const player = playersls[playersls.length-1];
          this._store.commit("players/update", {
                player,
                property: "id",
                value: params.token,
          });
          this._store.commit("players/update", {
                player,
                property: "name",
                value: params.username,
          });
          //this._store.commit("players/update_claim");
          break;
        }
      case 'clean_seat':
        {
          const playersls = this._store.state.players.players;
          for (let i = 0; i < playersls.length; i++) {
            const player = playersls[i];
            if (player.id == params) {
              this._store.commit("players/update", {
                player,
                property: "id",
                value: '',
              });
              this._store.commit("players/update", {
                    player,
                    property: "name",
                    value: '---',
              });
            }
          }
        }
      }
  }

  /**
   * ST are required to do something.
   * @returns 
   */
  _handleRequest(packet, type, payload) {
    if (this._isSpectator) return;
    console.log("request:", type, payload);
    this._store.commit(type, payload);
  }
  
  /**
   * Player sync the action from HOST.
   * @param payload
   */
  _handleSync(packet, type, payload) {
    if (!this._isSpectator) return;
    this._store.commit(type, payload);
  }

  /**
   * Yan_ice: mark.
   * Handle an incoming socket message.
   * @param data
   * @private
   */
  _handleMessage(packet, command, params) {
    switch (command) {
      case "getGamestate":
        this.sendGamestate(params);
        break;
      case "edition":
        this._updateEdition(params);
        break;
      case "fabled":
        this._updateFabled(params);
        break;
      case "gs":
        this._updateGamestate(params);
        break;
      case "player":
        this._updatePlayer(params);
        break;
      case "claim":
        this._updateSeat(params);
        break;
      case "ping":
        this._handlePing(params);
        break;
      case "nomination":
        if (!this._isSpectator) return;
        if (!params) {
          // create vote history record
          this._store.commit(
            "session/addHistory",
            this._store.state.players.players,
          );
        }
        this._store.commit("session/nomination", { nomination: params });
        break;
      case "swap":
        if (!this._isSpectator) return;
        this._store.commit("players/swap", params);
        break;
      case "move":
        if (!this._isSpectator) return;
        this._store.commit("players/move", params);
        break;
      case "remove":
        if (!this._isSpectator) return;
        this._store.commit("players/remove", params);
        break;
      case "marked":
        if (!this._isSpectator) return;
        this._store.commit("session/setMarkedPlayer", params);
        break;
      case "isNight":
        if (!this._isSpectator) return;
        this._store.commit("toggleNight", params);
        break;
      case "isVoteInProgress":
        if (!this._isSpectator) return;
        this._store.commit("session/setVoteInProgress", params);
        break;
      case "vote":
        this._handleVote(params);
        break;
      case "lock":
        this._handleLock(params);
        break;
      case "bye":
        this._handleBye(params);
        break;
      case "speaking":
        {
          this._store.dispatch("players/speak", 
            {
              idx: params[0],
              value: params[1]
            }
          );
        }
        break;
      case "privatechat":
        {
          this._store.dispatch("players/privatechat", 
            {
              idx: params[0],
              value: params[1]
            }
          );
        }
        break;
      case "tellmes":
        this._store.dispatch("players/receiveMes", {sender: packet.sender, message: params});
        //this._store.commit("loginbackend/receiveMes", {sender: packet.sender, receiver: packet.receiver, message: params});
        break;
      case "retrieveMessageLog":
        this._store.dispatch("players/syncMesTo", packet.sender);
        break;
    }
  }

  

  /**
   * Connect to a new live session, either as host or spectator.
   * Set a unique playerId if there isn't one yet.
   * @param sessionID
   */
  connect(sessionID) {

    if (!this._store.state.loginbackend.playerId) {
      my_alert("error.");
      //this.login();
    }else{
      this._pings = {};
      this._store.commit("session/setPlayerCount", 0);
      this._store.commit("session/setPing", 0);
      this._isSpectator = this._store.state.session.isSpectator;

      this._isSpectator = true;
      this._open(sessionID);
    }
  }
  
  /**
   * Close the current session, if any.
   */
  disconnect() {
    this._pings = {};
    this._store.commit("session/setPlayerCount", 0);
    this._store.commit("session/setPing", 0);
    this._store.commit("session/setReconnecting", false);
    clearTimeout(this._reconnectTimer);
    if (this._socket) {
      if (this._isSpectator) {
        this._sendDirect("sessionset", "bye", this._store.state.loginbackend.playerId);
      }
      this._socket.close(1000);
      this._socket = null;
    }
  }

  /**
   * Publish the current gamestate.
   * Optional param to reduce traffic. (send only player data)
   * @param playerId
   * @param isLightweight
   */
  sendGamestate(playerId = "", isLightweight = false) {
    if (this._isSpectator) return;
    this._gamestate = this._store.state.players.players.map((player) => ({
      name: player.name,
      id: player.id,
      isDead: player.isDead,
      isVoteless: player.isVoteless,
      pronouns: player.pronouns,
      ...(player.role && player.role.team === "traveler"
        ? { roleId: player.role.id }
        : {}),
    }));
    if (isLightweight) {
      this._sendDirect(playerId, "gs", {
        gamestate: this._gamestate,
        isLightweight,
      });
    } else {
      const { session, grimoire } = this._store.state;
      const { fabled } = this._store.state.players;
      this.sendEdition(playerId);
      this._sendDirect(playerId, "gs", {
        storyteller: this._store.state.players.storyteller,
        gamestate: this._gamestate,
        isNight: grimoire.isNight,
        isMaskGrimoire: grimoire.isMaskGrimoire,
        isVoteHistoryAllowed: session.isVoteHistoryAllowed,
        nomination: session.nomination,
        votingSpeed: session.votingSpeed,
        totalTimer: session.totalTimer,
        timerPhase: session.timerPhase,
        lockedVote: session.lockedVote,
        isVoteInProgress: session.isVoteInProgress,
        markedPlayer: session.markedPlayer,
        fabled: fabled.map((f) => (f.isCustom ? f : { id: f.id })),
        ...(session.nomination ? { votes: session.votes } : {}),
      });
    }
  }

  /**
   * Update the gamestate based on incoming data.
   * @param data
   * @private
   */
  _updateGamestate(data) {
    if (!this._isSpectator) return;
    const {
      storyteller,
      gamestate,
      isLightweight,
      isNight,
      isMaskGrimoire,
      isVoteHistoryAllowed,
      nomination,
      votingSpeed,
      totalTimer,
      timerPhase,
      votes,
      lockedVote,
      isVoteInProgress,
      markedPlayer,
      fabled,
    } = data;
    const players = this._store.state.players.players;
    if (storyteller) {
      this._store.commit("players/update", { player: 100, property: "name", value: storyteller.name});
      this._store.commit("players/update", { player: 100, property: "id", value: storyteller.id});
    }
    // adjust number of players
    if (players.length < gamestate.length) {
      for (let x = players.length; x < gamestate.length; x++) {
        this._store.commit("players/add", gamestate[x].name);
      }
    } else if (players.length > gamestate.length) {
      for (let x = players.length; x > gamestate.length; x--) {
        this._store.commit("players/remove", x - 1);
      }
    }
    // update status for each player
    gamestate.forEach((state, x) => {
      const player = players[x];
      const { roleId } = state;
      // update relevant properties
      ["name", "id", "isDead", "isVoteless", "pronouns"].forEach((property) => {
        const value = state[property];
        if (player[property] !== value) {
          this._store.commit("players/update", { player, property, value });
        }
      });
      // roles are special, because of travelers
      if (roleId && player.role.id !== roleId) {
        const role =
          this._store.state.roles.get(roleId) ||
          this._store.getters.rolesJSONbyId.get(roleId);
        if (role) {
          this._store.commit("players/update", {
            player,
            property: "role",
            value: role,
          });
        }
      } else if (!roleId && player.role.team === "traveler") {
        this._store.commit("players/update", {
          player,
          property: "role",
          value: {},
        });
      }
    });

    //start timer quickly
    this._store.commit("session/setTotalTimer", totalTimer);
    this._store.commit("session/setTimerPhase", timerPhase);

    if (!isLightweight) {
      this._store.commit("toggleNight", !!isNight);
      this._store.commit("toggleMaskGrimoire", !!isMaskGrimoire);
      this._store.commit("session/setVoteHistoryAllowed", isVoteHistoryAllowed);
      this._store.commit("session/nomination", {
        nomination,
        votes,
        votingSpeed,
        lockedVote,
        isVoteInProgress,
      });
      this._store.commit("session/setMarkedPlayer", markedPlayer);
      this._store.commit("players/setFabled", {
        fabled: fabled.map((f) => this._store.state.fabled.get(f.id) || f),
      });
    }
  }

  /**
   * Publish an edition update. ST only
   * @param playerId
   */
  sendEdition(playerId = "") {
    if (this._isSpectator) return;
    const { edition } = this._store.state;
    let roles;
    if (!edition.isOfficial) {
      roles = this._store.getters.customRolesStripped;
    }
    this._sendDirect(playerId, "edition", {
      edition: edition.isOfficial ? { id: edition.id } : edition,
      ...(roles ? { roles } : {}),
    });
  }

  /**
   * Update edition and roles for custom editions.
   * @param edition
   * @param roles
   * @private
   */
  _updateEdition({ edition, roles }) {
    if (!this._isSpectator) return;
    this._store.commit("setEdition", edition);
    if (roles) {
      this._store.commit("setCustomRoles", roles);
      if (this._store.state.roles.size !== roles.length) {
        const missing = [];
        roles.forEach(({ id }) => {
          if (!this._store.state.roles.get(id)) {
            missing.push(id);
          }
        });
        my_alert(
          `This session contains custom characters that can't be found. ` +
            `Please load them before joining! ` +
            `Missing roles: ${missing.join(", ")}`,
        );
        //this.disconnect();
        this._store.commit("toggleModal", "edition");
      }
    }
  }

  /**
   * Publish a fabled update. ST only
   */
  sendFabled() {
    if (this._isSpectator) return;
    const { fabled } = this._store.state.players;
    this._send(
      "fabled",
      fabled.map((f) => (f.isCustom ? f : { id: f.id })),
    );
  }

  /**
   * Update fabled roles.
   * @param fabled
   * @private
   */
  _updateFabled(fabled) {
    if (!this._isSpectator) return;
    this._store.commit("players/setFabled", {
      fabled: fabled.map((f) => this._store.state.fabled.get(f.id) || f),
    });
  }

  /**
   * Publish a player update.
   * @param player
   * @param property
   * @param value
   */
  sendPlayer({ player, property, value }) {
    //No reminder, no user.
    if (this._isSpectator || property === "reminders" ||  property === "reminders2") return;

    const index = this._store.state.players.players.indexOf(player);
    if (property === "role") {
      if (value.team && value.team === "traveler") {
        // update local gamestate to remember this player as a traveler
        this._gamestate[index].roleId = value.id;
        this._send("player", {
          index,
          property,
          value: value.id,
        });
      } else if (this._gamestate[index].roleId) {
        // player was previously a traveler
        delete this._gamestate[index].roleId;
        this._send("player", { index, property, value: "" });
      }
    } else if (property !== "role2" && property !== "hasUnreadMessage"){
      this._send("player", { index, property, value });
    }
  }

  /**
   * Update a player based on incoming data. Player only.
   * @param index
   * @param property
   * @param value
   * @private
   */
  _updatePlayer({ index, property, value }) {
    if (!this._isSpectator) return;
    const player = this._store.state.players.players[index];
    if (!player) return;
    // special case where a player stops being a traveler
    if (property === "role") {
      if (!value && player.role.team === "traveler") {
        // reset to an unknown role
        this._store.commit("players/update", {
          player,
          property: "role",
          value: {},
        });
      } else {
        // load role, first from session, the global, then fail gracefully
        const role =
          this._store.state.roles.get(value) ||
          this._store.getters.rolesJSONbyId.get(value) ||
          {};
        this._store.commit("players/update", {
          player,
          property: "role",
          value: role,
        });
      }
    } else if (property === "role2") {
      const role2 =
          this._store.state.roles.get(value) ||
          this._store.getters.rolesJSONbyId.get(value) ||
          {};
      this._store.commit("players/update", {
          player,
          property: "role2",
          value: role2,
        });
    }else {
      // just update the player otherwise
      this._store.commit("players/update", { player, property, value });
    }
  }


  /**
   * Handle a ping message by another player / storyteller
   * @param playerIdOrCount
   * @param latency
   * @private
   */
  _handlePing([playerIdOrCount = 0, latency] = []) {
    const now = new Date().getTime();
    if (!this._isSpectator) {
      // remove players that haven't sent a ping in twice the timespan
      for (let player in this._players) {
        if (now - this._players[player] > this._pingInterval * 2) {
          delete this._players[player];
          delete this._pings[player];
        }
      }
      // remove claimed seats from players that are no longer connected
      this._store.state.players.players.forEach((player) => {
        if (player.id && !this._players[player.id]) {
          this._store.commit("players/update", {
            player,
            property: "id",
            value: "",
          });
        }
      });
      // store new player data
      if (playerIdOrCount) {
        this._players[playerIdOrCount] = now;
        const ping = parseInt(latency, 10);
        if (ping && ping > 0 && ping < 30 * 1000) {
          // ping to Players
          this._pings[playerIdOrCount] = ping;
          const pings = Object.values(this._pings);
          this._store.commit(
            "session/setPing",
            Math.round(pings.reduce((a, b) => a + b, 0) / pings.length),
          );
        }
      }
    } else if (latency) {
      // ping to ST
      this._store.commit("session/setPing", parseInt(latency, 10));
    }
    // update player count
    if (!this._isSpectator || playerIdOrCount) {
      this._store.commit(
        "session/setPlayerCount",
        this._isSpectator ? playerIdOrCount : Object.keys(this._players).length,
      );
    }
  }

  /**
   * Handle a player leaving the sessions. ST only
   * @param playerId
   * @private
   */
  _handleBye(playerId) {
    if (this._isSpectator) return;
    delete this._players[playerId];
    this._store.commit(
      "session/setPlayerCount",
      Object.keys(this._players).length,
    );
  }

  /**
   * Claim a seat, needs to be confirmed by the Storyteller.
   * Seats already occupied can't be claimed.
   * @param seat either -1 to vacate or the index of the seat claimed
   */
  claimSeat(seat) {
    if (!this._isSpectator) return;
    const packet = new CommandPacket("sessionset");
    packet.addCommand("claimseat",seat);
    this._sendPacket(packet);
    // const players = this._store.state.players.players;
    // if (players.length > seat && (seat < 0 || !players[seat].id)) {
    //   this._send("claim", [seat, this._store.state.loginbackend.playerId]);
    // }
  }
  
  tell(receiver, message) {
    const mes = new CommandPacket("direct");
    
    mes.sender = this._store.state.loginbackend.playerId;
    mes.receiver = receiver;

    mes.addCommand("tellmes", message);
    this._sendPacket(mes);
  }
  
  /**
   * Update a player id associated with that seat.
   * @param index seat index or -1
   * @param value playerId to add / remove
   * @private
   */
  _updateSeat([index, value]) {
    if (this._isSpectator) return;
    const property = "id";
    const players = this._store.state.players.players;
    // remove previous seat
    const oldIndex = players.findIndex(({ id }) => id === value);
    if (oldIndex >= 0 && oldIndex !== index) {
      this._store.commit("players/update", {
        player: players[oldIndex],
        property,
        value: "",
      });
    }
    // add playerId to new seat
    if (index >= 0) {
      const player = players[index];
      if (!player) return;
      this._store.commit("players/update", { player, property, value });
    }
    // update player session list as if this was a ping
    this._handlePing([true, value, 0]);
  }

  /**
   * Distribute player roles to all seated players in a direct message.
   * This will be split server side so that each player only receives their own (sub)message.
   */
  distributeRoles(shuffle) {
    if (this._isSpectator) return;
    this._store.state.players.players.forEach((player, index) => {
      if (player.id) {
        const cmd = new CommandPacket("direct");
        cmd.receiver = player.id;
        if(shuffle && (Math.random() > 0.5)) {
          cmd.addCommand("player", {index, property: "role2", value: player.role.id});
          cmd.addCommand("player", {index, property: "role", value: player.role2.id});
        }else{
          cmd.addCommand("player", {index, property: "role", value: player.role.id});
          cmd.addCommand("player", {index, property: "role2", value: player.role2.id});
        }
        
        // Yan_ice: TODO
        // message[player.id] = [
        //   "player",
        //   { index, property: "role", value: player.role.id },
        // ];
        this._sendPacket(cmd);
      }
    });
  }

  /**
   * A player nomination. ST only
   * This also syncs the voting speed to the players.
   * Payload can be an object with {nomination} property or just the nomination itself, or undefined.
   * @param payload [nominator, nominee]|{nomination}
   */
  nomination(payload) {
    if (this._isSpectator) return;
    const nomination = payload ? payload.nomination || payload : payload;
    const players = this._store.state.players.players;
    if (
      !nomination ||
      (players.length > nomination[0] && players.length > nomination[1])
    ) {
      this.setVotingSpeed(this._store.state.session.votingSpeed);
      this._send("nomination", nomination);
    }
  }

  /**
   * Send a vote. Player or ST
   * @param index Seat of the player
   * @param sync Flag whether to sync this vote with others or not
   */
  vote([index]) {
    const player = this._store.state.players.players[index];
    if (
      this._store.state.loginbackend.playerId === player.id ||
      !this._isSpectator
    ) {
      // send vote only if it is your own vote or you are the storyteller
      this._send("vote", [
        index,
        this._store.state.session.votes[index],
        !this._isSpectator,
      ]);
    }
  }

  /**
   * Handle an incoming vote, but only if it is from ST or unlocked.
   * @param index
   * @param vote
   * @param fromST
   */
  _handleVote([index, vote, fromST]) {
    const { session, players } = this._store.state;
    const playerCount = players.players.length;
    const indexAdjusted =
      (index - 1 + playerCount - session.nomination[1]) % playerCount;
    if (fromST || indexAdjusted >= session.lockedVote - 1) {
      this._store.commit("session/vote", [index, vote]);
    }
  }

  /**
   * Lock a vote. ST only
   */
  lockVote() {
    if (this._isSpectator) return;
    const { lockedVote, votes, nomination } = this._store.state.session;
    const { players } = this._store.state.players;
    const index = (nomination[1] + lockedVote - 1) % players.length;
    this._send("lock", [this._store.state.session.lockedVote, votes[index]]);
  }

  setSpeaking(isspeaking) { // todo: send speaking to host
    const players = this._store.state.players.players;
    for(let a = 0;a<players.length;a++){
      if(players[a].id == this._store.state.loginbackend.playerId) {
        this._sendDirect("host", "speaking", [a, isspeaking]);
      }
    }
  }

  setPrivateChat(isPrivateChat) { // todo: send privchat to host
    const players = this._store.state.players.players;
    for(let a = 0;a<players.length;a++){
      if(players[a].id == this._store.state.loginbackend.playerId) {
        this._sendDirect("host", "privatechat", [a, isPrivateChat]);
      }
    }
  }
  /**
   * Update vote lock and the locked vote, if it differs. Player only
   * @param lock
   * @param vote
   * @private
   */
  _handleLock([lock, vote]) {
    if (!this._isSpectator) return;
    this._store.commit("session/lockVote", lock);
    if (lock > 1) {
      const { lockedVote, nomination } = this._store.state.session;
      const { players } = this._store.state.players;
      const index = (nomination[1] + lockedVote - 1) % players.length;
      if (this._store.state.session.votes[index] !== vote) {
        this._store.commit("session/vote", [index, vote]);
      }
    }
  }

    /**
     * Send a CommandPacket through the socket.
     * @param command
     * @param params
     * @private
    */
  _sendPacket(packet) {
      const sessionId = this._store.state.loginbackend.sessionId;
      if(sessionId){ 
        packet.session = sessionId;
      }
      if (this._socket && this._socket.readyState == 1) {
        this._socket.send(packet.serialize());
      }
  }

  /**
   * ST boardcast the action
   * @param payload
   */
  requestSync(type, payload) {
    if (this._isSpectator) return;
    const packet = new CommandPacket("sync");
    packet.addCommand(type, payload);
    this._sendPacket(packet);
  }

  /**
   * Kick a player. ST only
   * @param payload
   */
  kickPlayer(idx) {
    if (this._isSpectator) return;
    const playersls = this._store.state.players.players;
    const packet = new CommandPacket("sessionset");
    if(idx > 100){
      packet.addCommand("kick", idx);
    }else{
      packet.addCommand("kick", playersls[idx].id);
    }
    
    this._sendPacket(packet);
  }

  sendPrivateChatRequest(targetId) { //enpty means leave chat.
    if (!this._isSpectator) return;
      const packet = new CommandPacket("sessionset");
      packet.addCommand("private_chat", targetId);
      this._sendPacket(packet);
      if(targetId) {
        this._store.commit("toggleModal", "privateChat");
      }else{
        this._store.commit("toggleModal", "");
      }
  }

  sendFollowChatRequest(targetId) { //enpty means leave chat.
    if (this._isSpectator) return;
      const packet = new CommandPacket("sessionset");
      packet.addCommand("follow_chat", targetId);
      this._sendPacket(packet);
      if(targetId) {
        this._store.commit("toggleModal", "followChat");
      }else{
        this._store.commit("toggleModal", "");
      }
  }
}


export default (store) => {
  // setup
  const session = new LiveSession(store);

  // listen to mutations
  store.subscribe(({ type, payload }, state) => {
    switch (type) {
      case "loginbackend/logout":
        session.disconnect();
        break;
      case "loginbackend/loginWithData":
        session.login(payload.username, payload.pwd);
        break;
      case "loginbackend/loginWithSystemMe":
        session.login('', payload);
        break;
      case "session/privateChatRequest":
        session.sendPrivateChatRequest(payload.targetId);
        break;
      case "session/privateChatLeave":
        session.sendPrivateChatRequest('');
        break;
      case "session/followChatRequest":
        session.sendFollowChatRequest(payload.targetId);
        break;
      case "players/kick":
        session.kickPlayer(payload);
        break;
      case "session/distributeRoles":
        session.distributeRoles(payload);
        break;
      case "session/nomination":
      case "session/setNomination":
      case "session/setVoteInProgress":
      case "session/setVotingSpeed":
      case "toggleNight":
      case "toggleMaskGrimoire":
      case "session/setVoteHistoryAllowed":
      case "session/clearVoteHistory":  
      case "session/setMarkedPlayer":
      case "session/addHistory":
      case "session/setTotalTimer":
      case "session/setTimerPhase":
      case "players/setTalking":
      case "players/setPrivateChat":
      case "players/swap":
      case "players/move":
      case "players/remove":
      case "session/clearVoteHistory":
        session.requestSync(type, payload);
        break;
      case "session/sendCommand":
        let sessionid = state.loginbackend.sessionId;
        if(payload.session){
          sessionid = payload.session;
        }
        let packet = new CommandPacket(payload.header, sessionid);
        packet.sender = state.loginbackend.playerId;
        packet.receiver = payload.receiver;
        packet.addCommand(payload.command, payload.param);
        console.log("sendCommand", packet.serialize());
        session._sendPacket(packet);
        break;
      case "loginbackend/setPlayerIsSpeaking":
        session.setSpeaking(payload); //from player to host
        break;
      case "session/setPrivateChatConnected":
        session.setPrivateChat(payload); //from player to host
        break
      case "loginbackend/tellMes":
        session.tell(payload.receiver, payload.message);
        break;
      case "session/voteSync":
        //session.sync_mutation(type, payload);
        session.vote(payload);
        break;
      case "session/lockVote":
        session.lockVote();
        break;

      case "setEdition":
        //session.sync_mutation(type, payload);
        session.sendEdition();
        break;
      case "players/setFabled":
        //session.sync_mutation(type, payload);
        session.sendFabled();
        break;
      case "players/set":
      case "players/clear":
      case "players/add":
        session.sendGamestate("", true);
        break;
      case "players/update":
        session.sendPlayer(payload);
        break;
    }
  });

};
