
import mediasoupRoom from '@/store/mediabackend';

const state = () => ({
    sessionId: '',
    playerId: '',
    username: '',
    pwd: '2333',
    isSpeaking: false,
    isMute: true,
    isMdict: true,
    networkPoor: false,
    backendServer: null,
    vocalServer: null,
    selfNotes: '',
    currentChatIndex: -1
});

// mutations helper functions
const set = (key) => (state, val) => {
    state[key] = val;
  };


const mutations = {
    setPlayerId: set("playerId"),
    setSessionId: set("sessionId"),
    setNotes: set("selfNotes"),
    setPlayerIsSpeaking: set("isSpeaking"),
    setNetworkPoor: set("networkPoor"),
    setMdict(state, val) {
      if(val){
        state.isMdict = true;
      }else{
        state.isMdict = false;
      }
    },
    setCurrentChatIndex(state, val) {
      state.currentChatIndex = val;
    },
    tellMes(state, payload) { //listened by socket
      console.log("\n[你 -> "+payload.receiver+"] "+payload.message);
    },
    toggleMute(state) {
      state.isMute = !state.isMute;
      mediasoupRoom.setMute(state.isMute);
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
    tryQuickLogin(state) {
        console.log("tryQuickLogin");
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

const actions = {

  async logout({ state, commit }) {

    commit("setPlayerId", '');
    if (state.sessionId) {
      try {
       await mediasoupRoom.leaveRoom();
      } catch (e) {
       console.warn("leaveRoom error:", e);
      }
    }

  },

  async joinSession({ state, commit }, payload) {
    // 调用语音模块 joinRoom，参数用 store 中的 playerId 和 roomId
    // 这里假设 roomId 也放在 state 里，或从别处传入（可根据需求调整）
    if (!state.playerId) {
      console.warn("playerId not set, cannot joinRoom");
      return;
    }
    commit("session/setWatcher", false, {root: true});
    commit("setSessionId", payload.sessionId);

    if(!state.isMdict) {
      my_alert("当前未使用魔典内置语音。若要启用，请重新进入房间。");
    }else{
      await mediasoupRoom.joinRoom(payload.sessionId, state.playerId, state.vocalServer);
      mediasoupRoom.setMute(state.isMute);
      mediasoupRoom.setUpdateCallback(() => {
        commit("setNetworkPoor", mediasoupRoom.isNetworkPoor);
        commit("setPlayerIsSpeaking", mediasoupRoom.loud_keep > 0);
      })
    }
  },

  async leaveSession({ state, commit }) {
    
    if (!state.playerId) {
      console.warn("playerId not set, cannot leaveRoom");
      return;
    }
    commit("setSessionId", '');

    try {
        await mediasoupRoom.leaveRoom();
    } catch (e) {
        console.warn("leaveRoom error:", e);
    }

  },

  async observeSession({ state, commit }, payload) {
    if (!state.playerId) {
      console.warn("playerId not set, cannot observe session");
      return;
    }
    commit("session/setWatcher", true, {root: true});
    commit("setSessionId", payload.sessionId);
  },


};


export default {
    namespaced: true,
    state,
    mutations,
    actions
  };
  
