const state = () => ({
    sessionId: '',
    playerId: '',
    username: '',
    pwd: '2333',
    isSpeaking: false,
    commandToServer: null,
    backendServer: null,
    vocalServer: null,
});

// mutations helper functions
const set = (key) => (state, val) => {
    state[key] = val;
  };


const mutations = {
    setPlayerId: set("playerId"),
    setSessionId: set("sessionId"),
    setCommandToServer: set("commandToServer"),
    setPlayerIsSpeaking: set("isSpeaking"),
    resetServerURL(state) {
        state.backendServer = null;
        state.vocalServer = null;
        state.sessionId = '';
        state.playerId = '';
        state.username = '';
    },
    setServerURL(state, url) {
        state.backendServer = "ws://"+url+":8081/";
        state.vocalServer = "ws://"+url+":8082/";
    },
    loginWithData(state, payload) {
        state.username = payload.id;
        state.pwd = payload.pwd;
        console.log("login with usrname.");
    },
    loginWithToken(state, payload) {
        state.playerId = payload.playerId;
        console.log("login with token.");
    },
    logout(state) {
        state.playerId = '';
        state.username = '';
        state.pwd = '';
        console.log("logout success.");
    },
};

import mediasoupRoom from '@/store/mediabackend';

const actions = {

  async logout({ state, commit }) {

    if (state.sessionId) {
      try {
        await mediasoupRoom.leaveRoom();
      } catch (e) {
        console.warn("leaveRoom error:", e);
      }
    }
    commit("setPlayerId", '');
  },

  async joinSession({ state, commit }, payload) {
    // 调用语音模块 joinRoom，参数用 store 中的 playerId 和 roomId
    // 这里假设 roomId 也放在 state 里，或从别处传入（可根据需求调整）
    if (!state.playerId) {
      console.warn("playerId not set, cannot joinRoom");
      return;
    }

    console.log("joinRoom", state.playerId, payload.sessionId);
    console.log(mediasoupRoom);
    try {
      await mediasoupRoom.joinRoom(payload.sessionId, state.playerId);
    } catch (e) {
      console.error("joinRoom failed:", e);
      alert("错误：无法连接至语音服务器。");
    }
    commit("setSessionId", payload.sessionId);
  },

  async leaveSession({ state, commit }) {
    
    if (!state.playerId) {
      console.warn("playerId not set, cannot leaveRoom");
      return;
    }
    try {
        await mediasoupRoom.leaveRoom();
    } catch (e) {
        console.warn("leaveRoom error:", e);
    }
    commit("setSessionId", '');
  },


};


export default {
    namespaced: true,
    state,
    mutations,
    actions
  };
  