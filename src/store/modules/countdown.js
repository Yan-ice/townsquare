// store/modules/countdown.js
let countdownTimer = null;

const state = {
  timeLeft: 0,
  running: false
};

const mutations = {
  SET_TIME(state, seconds) {
    state.timeLeft = seconds;
  },
  DECREMENT_TIME(state) {
    if (state.timeLeft > 0) {
      state.timeLeft--;
    }
  },
  SET_RUNNING(state, flag) {
    state.running = flag;
  },
  RESET(state) {
    state.timeLeft = 0;
    state.running = false;
  }
};

const actions = {
  setCountdown({ commit }, seconds) {
    clearInterval(countdownTimer);
    commit('SET_TIME', seconds);
    commit('SET_RUNNING', false);
  },
  resetCountdown({ commit }) {
    clearInterval(countdownTimer);
    commit('RESET');
  },
  startCountdown({ commit, state, dispatch }) {
    clearInterval(countdownTimer);
    commit('SET_RUNNING', true);

    countdownTimer = setInterval(() => {
      if (state.timeLeft > 0) {
        commit('DECREMENT_TIME');
      } else {
        clearInterval(countdownTimer);
        commit('SET_RUNNING', false);
        // 可选：倒计时结束后触发全局事件
        dispatch('onCountdownFinished');
      }
    }, 1000);
  },
  onCountdownFinished() {
    console.log("⏰ Countdown finished.");
    // 可做一些全局回调或 mutation 通知其他模块
  }
};

export default {
  namespaced: true,
  state,
  mutations,
  actions
};
