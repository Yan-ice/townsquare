
import mediasoupRoom from '@/store/mediabackend';

const state = () => ({
    sessionId: '',
    playerId: '',
    username: '',
    pwd: '2333', 
    canStoryteller: false,
    canVocalStoryteller: false,
    isMdict: false, //使用内置语音
    backendServer: null,
    vocalServer: null,
    selfNotes: ''
});

// mutations helper functions
const set = (key) => (state, val) => {
    state[key] = val;
  };


const mutations = {
    setPlayerId: set("playerId"),
    setSessionId: set("sessionId"),
    setUsername: set("username"),
    setCanStoryteller: set("canStoryteller"),
    setNotes: set("selfNotes"),
    setMdict(state, val) {
      if(val){
        state.isMdict = true;
      }else{
        state.isMdict = false;
      }
    },

    resetServerURL(state) {
        state.backendServer = null;
        state.vocalServer = null;
        state.sessionId = '';
        state.playerId = '';
        state.username = '';
    },
    setServerURL(state, url) {
        state.backendServer = "wss://"+url+":8081/";
        state.vocalServer = "wss://"+url+":8082/";
    },
    loginWithData(state, payload) {
        state.username = payload.username;
        state.pwd = payload.pwd;
        console.log("login with usrname.");
    },
    loginWithStorage(state) { //listen by persistence
        console.log("get login data from storage.");
    },
    loginWithSystemMe(state, payload) { //listen
      console.log("login with system me.");
      console.log(payload);
  },
    logout(state) {
        state.playerId = '';
        state.username = '';
        state.pwd = '';
        console.log("logout success.");
    },
};

const actions = {

  async logout({ state, commit }) {

    commit("setPlayerId", '');
    if (state.sessionId) {
      let command1 = {
        "header": "request",
        "receiver": "host",
        "command": "chat/leaveChatChannel",
        "param": {
          "userId": state.playerId
        },
      }
      commit("session/sendCommand", command1, {root: true});
    }

  },

  async joinSession({ state, commit }, payload) {
    // 调用语音模块 joinRoom，参数用 store 中的 playerId 和 roomId
    // 这里假设 roomId 也放在 state 里，或从别处传入（可根据需求调整）
    if (!state.playerId) {
      console.warn("playerId not set, cannot joinRoom");
      return;
    }
    //setWatcher should be done before this.
    //commit("setSessionId", payload.sessionId); //socket listen

    let command = {
      "header": "sessionset",
      "session": payload.sessionId,
      "command": "join",
      "param": payload.mdict
    }
    commit("session/sendCommand", command, {root: true});

  },
  async observeSession({ state, commit }, payload) {
    //setWatcher should be done before this.
    if (!state.playerId) {
      console.warn("playerId not set, cannot observe session");
      return;
    }
    let command = {
      "header": "sessionset",
      "session": payload.sessionId,
      "command": "watch",
      "param": false
    }
    commit("session/sendCommand", command, {root: true});
  },

  async leaveSession({ state, commit }) {
    
    if (!state.playerId) {
      console.warn("playerId not set, cannot leaveRoom");
      return;
    }

    let command1 = {
      "header": "request",
      "receiver": "host",
      "command": "chat/leaveChatChannel",
      "param": {
        "userId": state.playerId
      },
    }
    commit("session/sendCommand", command1, {root: true});

    let command = {
      "header": "sessionset",
      "command": "leave",
      "param": "--"
    }
    commit("session/sendCommand", command, {root: true});

  },

};


export default {
    namespaced: true,
    state,
    mutations,
    actions
  };
  
