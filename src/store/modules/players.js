import Vue from 'vue';

const state = () => ({
  storyteller: {
    name: "",
    id: "",
    role: {"id": "_storyteller",
      "name": "说书人",
      "3": "说书人天下第一!"
    }, 
    role2: {"id": "_storyteller",
      "name": "说书人",
      "3": "说书人天下第一!"
    }, 
    talkingTimer: null,
    isTalkingFlag: false,
    privateChat: false,
    isOnline: true,
    hasUnreadMessage: false,
    messageLogWithHim: '',
    isST: true
  },
  players: [],
  fabled: [],
  bluffs: [],
});

function findIndex(state, player) {
    let index = -1;
    if(Number.isInteger(Number(player))) {
      if(Number(player) > 1000) {
        for(let a = 0;a<state.players.length;a++) {
          if(state.players[a].id === player) {
            index = a;
          }
        }
        //story teller has fixed index 100.
        if(state.storyteller.id != '' && state.storyteller.id === player) {
          index = 100;
        }
      }else{
        index = Number(player);
      }
    }else{
      index = state.players.indexOf(player);
      if(state.storyteller.id != '' && player.id === state.storyteller.id) {
        index = 100;
      }
    }
    return index;
}



const getters = {
  alive({ players }) {
    return players.filter((player) => !player.isDead).length;
  },
  playerToIndex: (state) => (player) => {
    let index = -1;
    if(Number.isInteger(Number(player))) {
      if(Number(player) > 1000) {
        for(let a = 0;a<state.players.length;a++) {
          if(state.players[a].id === player) {
            index = a;
          }
        }
        //story teller has fixed index 100.
        if(state.storyteller.id != '' && state.storyteller.id === player) {
          index = 100;
        }
      }else{
        index = Number(player);
      }
    }else{
      index = state.players.indexOf(player);
      if(state.storyteller.id != '' && player.id === state.storyteller.id) {
        index = 100;
      }
    }
    return index;
  },
  indexToPlayer: (state) => (index) => {
    if(index == -1) {
      return NEWPLAYER;
    }
    if(index == 100) {
      return state.storyteller;
    }
    return state.players[index];
  },
  uidToPlayer: (state) => (uid) => {
    if(state.storyteller.id == uid) {
      return state.storyteller;
    }
    return state.players.find(player => player.id === uid) || null;
  },
  nonTravelers({ players }) {
    const nonTravelers = players.filter(
      (player) => player.role.team !== "traveler",
    );
    return Math.min(nonTravelers.length, 15);
  },
  // calculate a Map of player => night order
  nightOrder({ players, fabled }) {
    const firstNight = [0];
    const otherNight = [0];
    players.forEach(({ role, role2 }) => {
      if (role.firstNight && !firstNight.includes(role.firstNight)) {
        firstNight.push(role.firstNight);
      }
      if (role.otherNight && !otherNight.includes(role.otherNight)) {
        otherNight.push(role.otherNight);
      }

      if (role2.firstNight && !firstNight.includes(role2.firstNight)) {
        firstNight.push(role2.firstNight);
      }
      if (role2.otherNight && !otherNight.includes(role2.otherNight)) {
        otherNight.push(role2.otherNight);
      }
      //Yan_ice: role2 added
    });
    fabled.forEach((role) => {
      if (role.firstNight && !firstNight.includes(role.firstNight)) {
        firstNight.push(role.firstNight);
      }
      if (role.otherNight && !otherNight.includes(role.otherNight)) {
        otherNight.push(role.otherNight);
      }
    });
    firstNight.sort((a, b) => a - b);
    otherNight.sort((a, b) => a - b);
    const nightOrder = new Map();
    players.forEach((player) => {
      const first1 = Math.max(firstNight.indexOf(player.role.firstNight), 0);
      const other1 = Math.max(otherNight.indexOf(player.role.otherNight), 0);
      const first2 = Math.max(firstNight.indexOf(player.role2.firstNight), 0);
      const other2 = Math.max(otherNight.indexOf(player.role2.otherNight), 0);
      nightOrder.set(player, { first1, other1, first2, other2 });
    });
    fabled.forEach((role) => {
      const first = Math.max(firstNight.indexOf(role.firstNight), 0);
      const other = Math.max(otherNight.indexOf(role.otherNight), 0);
      nightOrder.set(role, { first, other });
    });
    return nightOrder;
  },
};

const actions = {
  randomize({ state, commit }) {
    const players = state.players
      .map((a) => [Math.random(), a])
      .sort((a, b) => a[0] - b[0])
      .map((a) => a[1]);
    commit("set", players);
  },
  speak({ commit, state }, { idx, value }) {
    if (value) {
      commit('setTalking', { idx, flag: true });

      const player = state.players[idx];
      if (player.talkingTimer) {
        clearTimeout(player.talkingTimer);
      }

      player.talkingTimer = setTimeout(() => {
        commit('setTalking', { idx, flag: false });
        player.talkingTimer = null;
      }, 1500);
    }
  },
  privatechat({ commit }, { idx, value }) {
    commit('setPrivateChat', { idx, flag: value });
  },

  receiveMes({ commit }, payload){
    commit('updateMes', {
      sender: payload.sender,
      tellerName: '', //'' means tellname is the name of sender.
      message: payload.message
    });
  },
  syncMesTo({ state, commit }, sender) { //no record, want to fetch from other people.
    const index = findIndex(state, sender);
    if(index == -1) {
      console.log("who wants sync??");
      return;
    }
    const player =
      index === 100 ? state.storyteller : state.players[index];

    const mes = player.messageLogWithHim ? player.messageLogWithHim : "[游戏开始]\n"
    commit("loginbackend/tellMes", {
      receiver: sender,
      message: "___restore___" + mes,
      rawFormat: true,
    }, { root: true }); // root: true 是关键，跨模块 commit
    
  }
};

const mutations = {

  add(state) {
    state.players.push({
      name: "",
      id: "",
      role: {},
      role2: {},
      reminders: [],
      reminders2: [],
      isVoteless: false,
      talkingTimer: null,
      isTalkingFlag: false,
      privateChat: false,
      isOnline: true,
      isDead: false,
      hasUnreadMessage: false,
      messageLogWithHim: ''
    });
  },

  clear(state) {
    state.players = [];
    state.bluffs = [];
    state.fabled = [];
  },
  set(state, players = []) {
    state.players = players;
  },
  clearRoles(state) {
    state.players = state.players.map((player) => {
      if (player.role.team !== "traveler") {
        player.role = {};
        player.role2 = {};
      }
      player.reminders = [];
      return player;
    });
    state.bluffs = [];
  },
  updateMes(state, {sender, tellerName, message}) {
    const index = findIndex(state, sender);
    if(index == -1) {
      return;
    }
    let player = state.storyteller;
    if(index != 100) {
      player = state.players[index];
    }
    if(tellerName == '') {
      tellerName = player.name;
    }
    if (message.startsWith("___restore___")) {
      message = message.replace("___restore___", "");
      Vue.set(player, 'messageLogWithHim', message);
    } else {
      Vue.set(player, 'messageLogWithHim', player.messageLogWithHim + "\n["+tellerName+ "] "+message);
      Vue.set(player, 'hasUnreadMessage', true);
    }
    
  },

  checkMes(state, {sender}) {
    const index = findIndex(state, sender);
    if(index == -1) {
      return;
    }
    
    if(index != 100) {
      const player = state.players[index];
      Vue.set(player, 'hasUnreadMessage', false);
    }else{
      const player = state.storyteller;
      Vue.set(player, 'hasUnreadMessage', false);
    }
    
  },
  /**
  The update mutation also has a property for isFromSockets
  this property can be addded to payload object for any mutations
  then can be used to prevent infinite loops when a property is
  able to be set from multiple different session on websockets.
  An example of this is in the sendPlayerPronouns and _updatePlayerPronouns
  in socket.js.

  STORY TELLER HAS INDEX 100.

   */
  update(state, { player, property, value }) {

    const index = findIndex(state, player);
    if(index == -1) {
      return;
    }

    console.log("updating: ", index, property, value);
    if (index == 100) {
      state.storyteller[property] = value;
    }else if (index >= 0) {
      state.players[index][property] = value;
    }
  },

  setTalking(state, { idx, flag }) {
    const player = state.players[idx];
    // 用 Vue.set 保证响应式
    Vue.set(player, 'isTalkingFlag', flag);
  },

  setPrivateChat(state, { idx, flag }) {
    const player = state.players[idx];
    // 用 Vue.set 保证响应式
    Vue.set(player, 'privateChat', flag);
  },

  kick(state, idx) {
    if(idx < 100) {
      const player = state.players[idx];
      player.name = '';
    }else{
      state.players.forEach((player) => {
        if(player.id == idx) {
          player.name = '';
        }
      })
    }
    
    //nothing here, only for subscribe
  },
  speak(state, { idx, value }) {
    if (value) {
      const player = state.players[idx];

      if (player.talkingTimer) {
        clearTimeout(player.talkingTimer);
      }

      player.isTalkingFlag = true;  // 明确表示正在讲话

      player.talkingTimer = setTimeout(() => {
        player.isTalkingFlag = false;  // 定时结束，关闭状态
        player.talkingTimer = null;
      }, 1500);
    }
  // nothing here, only for subscribe
  },
  remove(state, index) {
    state.players.splice(index, 1);
  },
  swap(state, [from, to]) {
    [state.players[from], state.players[to]] = [
      state.players[to],
      state.players[from],
    ];
    // hack: "modify" the array so that Vue notices something changed
    state.players.splice(0, 0);
  },
  move(state, [from, to]) {
    state.players.splice(to, 0, state.players.splice(from, 1)[0]);
  },
  setBluff(state, { index, role } = {}) {
    if (index !== undefined) {
      state.bluffs.splice(index, 1, role);
    } else {
      state.bluffs = [];
    }
  },
  setFabled(state, { index, fabled } = {}) {
    if (index !== undefined) {
      state.fabled.splice(index, 1);
    } else if (fabled) {
      if (!Array.isArray(fabled)) {
        state.fabled.push(fabled);
      } else {
        state.fabled = fabled;
      }
    }
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
