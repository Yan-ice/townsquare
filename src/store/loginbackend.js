const state = () => ({
    sessionId: '',
    playerId: '',
    username: '默认用户名',
    pwd: '2333',
    isSpeaking: false,
    commandToServer: '',
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
        state.playerId = "";
        console.log("logout success.");
    },
};

export default {
    namespaced: true,
    state,
    mutations
  };
  