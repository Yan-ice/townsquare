import mediasoupRoom from './mediabackend.js';

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
    // reconnect to previous session
  }

  /**
   * Open a new session for the passed channel.
   * @param channel
   * @private
   */
    login(usrname, pwd) {
      this._wss = this._store.state.loginbackend.backendServer;

      this._socket = new WebSocket(
        this._wss + "login",
      );

      this._socket.addEventListener("message", this._handlePacket.bind(this));
      
      console.log("login with",usrname, pwd);

      // 设置连接超时（单位：毫秒）
      const timeoutDuration = 10000;
      let timeoutHandle = setTimeout(() => {
          if (this._socket && this._socket.readyState !== WebSocket.OPEN) {
            alert("无法连接到服务器。检查你的区服号，或服务器状态异常。");
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
          cmd.addCommand("token",{
            token: pwd,
          });
        }
        this._sendPacket(cmd);
        
      }
      this._socket.onopen = onOpenL.bind(this);

      this._socket.onclose = (err) => {
        this._socket = null;
        clearInterval(this._pingTimer);
        this._pingTimer = null;
        if (err.code !== 1000) {
          this._store.dispatch("loginbackend/logout");
          //this._store.commit("loginbackend/setSessionId", "");
          //this._store.commit("loginbackend/setPlayerId", "");
          if (err.reason) alert(err.reason);
        }
      };

      this._socket.onerror = () => {
        alert("服务器状态异常。");
        this._socket = null;
        if (this._pingTimer) {
          clearInterval(this._pingTimer);
          this._pingTimer = null;
        }
        // 可选：触发退出登录或提示
        this._store.commit("loginbackend/resetServerURL");
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
        packet.forEachCommand(this._handleRequire.bind(this));
        return;
      case 'sync':
        packet.forEachCommand(this._handleSync.bind(this));
        return;
      default:
        packet.forEachCommand(this._handleMessage.bind(this));
    }
  }

  _handleLogin(packet, command, params){
          switch (command) {
            case "success":  
              this._store.commit("loginbackend/setPlayerId", params['token']);
              break;
            case "failed":
              alert("登录失败：激活码无效, 或已被其他昵称使用。");
              this._store.commit("loginbackend/logout");
              break;
            case "session_restore":
              this._store.dispatch("loginbackend/joinSession", {sessionId: params});
              //this._store.commit("loginbackend/setSessionId", param);
              break;
          }
        
  }

  _handleSession(packet, command, params) {
      switch (command) {
        case 'state':
          if(params == 'host') {
            this._isSpectator = false;
            this._store.commit("session/setSpectator", false);
            this.sendGamestate();
          }else{
            this._isSpectator = true;
            this._store.commit("session/setSpectator", true);
            this._sendDirect(
                "host",
                "getGamestate",
                this._store.state.loginbackend.playerId,
              );
            const autocom = new CommandPacket("sessionset");
            autocom.addCommand("autoclaim");
            this._sendPacket(autocom)
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
      case 'leave_session':
        alert(params);
        this._store.dispatch("loginbackend/leaveSession");
        break;
      case 'logout':
        alert(params);
        
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
      case "isVoteHistoryAllowed":
        if (!this._isSpectator) return;
        this._store.commit("session/setVoteHistoryAllowed", params);
        this._store.commit("session/clearVoteHistory");
        break;
      case "votingSpeed":
        if (!this._isSpectator) return;
        this._store.commit("session/setVotingSpeed", params);
        break;
      case "clearVoteHistory":
        if (!this._isSpectator) return;
        this._store.commit("session/clearVoteHistory");
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
        this._store.commit("loginbackend/receiveMes", {sender: packet.sender, receiver: packet.receiver, message: params});
        break;
      case "showmessage":
        alert(params);
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
      alert("error.");
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

  xjoinSession(sessionID) {
    const packet = new CommandPacket("sessionset", sessionID);
    packet.sender = this._store.state.loginbackend.playerId;
    packet.addCommand("join","roompwd");
    this._sendPacket(packet);
  }
  xleaveSession() {
    const packet = new CommandPacket("sessionset", '');
    packet.sender = this._store.state.loginbackend.playerId;
    packet.addCommand("leave","-");
    this._sendPacket(packet);
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
        gamestate: this._gamestate,
        isNight: grimoire.isNight,
        isVoteHistoryAllowed: session.isVoteHistoryAllowed,
        nomination: session.nomination,
        votingSpeed: session.votingSpeed,
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
      gamestate,
      isLightweight,
      isNight,
      isVoteHistoryAllowed,
      nomination,
      votingSpeed,
      votes,
      lockedVote,
      isVoteInProgress,
      markedPlayer,
      fabled,
    } = data;
    const players = this._store.state.players.players;
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
    if (!isLightweight) {
      this._store.commit("toggleNight", !!isNight);
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
        alert(
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
    if (this._isSpectator || property === "reminders") return;
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
    } else if (property !== "role2"){
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
    
    let sender = this._store.state.loginbackend.username;
    if(!this._isSpectator){
      sender = '说书人';
    }
    let receiverId = '';
    if (receiver == '说书人'){
      receiverId = 'host';
    }else{
      const pls = this._store.state.players.players;
      for(let a = 0;a<pls.length;a++){
        if(receiver === pls[a].name) {
            receiverId = pls[a].id;
        }
      }
    }

    mes.sender = sender;
    mes.receiver = receiverId;

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
  distributeRoles() {
    if (this._isSpectator) return;
    this._store.state.players.players.forEach((player, index) => {
      if (player.id) {
        const cmd = new CommandPacket("direct");
        cmd.receiver = player.id;
        cmd.addCommand("player", {index, property: "role", value: player.role.id});
        cmd.addCommand("player", {index, property: "role2", value: player.role2.id});
        
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
      packet.session = sessionId;
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
   * Player sync the action
   * @param payload
   */
  _handleSync(packet, type, payload) {
    if (!this._isSpectator) return;
    this._store.commit(type, payload);
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
      case "loginbackend/loginWithToken":
        session.login('', payload.playerId);
        break;
      case "loginbackend/setSessionId":
        if (state.loginbackend.sessionId) {
          session.xjoinSession(state.loginbackend.sessionId);
        } else{
          session.xleaveSession();
        }
        break;
      case "session/privateChatRequest":
        session.sendPrivateChatRequest(payload.targetId);
        break;
      case "session/privateChatLeave":
        session.sendPrivateChatRequest('');
        break;
      case "players/kick":
        session.kickPlayer(payload);
        break;
      case "players/remove":
        session.requestSync(type, payload);
        break;
      case "session/distributeRoles":
        if (payload) {
          session.distributeRoles();
        }
        break;
      case "session/nomination":
      case "session/setNomination":
      case "session/setVoteInProgress":
      case "session/setVotingSpeed":
      case "toggleNight":
      case "session/setVoteHistoryAllowed":
      case "session/setMarkedPlayer":
      case "players/setTalking":
      case "players/setPrivateChat":
      case "players/swap":
      case "players/move":
      case "session/clearVoteHistory":
        session.requestSync(type, payload);
        break;
      case "session/sendCommand":
        session._sendPacket(payload);
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
