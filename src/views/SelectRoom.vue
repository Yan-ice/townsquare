<template>
  <div class="login-container">
    <h2 class="title">欢迎，{{ username }}</h2>

    <form @submit.prevent="handleSubmit" class="login-form">
      <input v-model="room" type="text" placeholder="请输入房间号" required />
      <button type="submit">{{ $store.state.loginbackend.canStoryteller ? "创建/加入房间" : "加入房间" }}</button>
      <label class="observer-checkbox blackp">
        <input v-model="isObserver" type="checkbox" />
        以旁观游戏身份加入
      </label>
      <label class="observer-checkbox blackp">
        <input v-model="isMdict" type="checkbox" />
        使用魔典内置语音
      </label>
    </form>

    <button class="logout-button" @click="logout">退出登录</button>
    <p v-if="$store.state.dialog.message" class="title blackp">{{ $store.state.dialog.message }}</p>
  </div>
</template>

<script>

export default {
  computed: {
    username() {
      // 假设用户名存在 Vuex 的 loginbackend 模块中
      return this.$store.state.loginbackend.username;
    }
  },

  data() {
    return {
      room: '',
      isObserver: false,
      isMdict: true
    };
  },

  methods: {
    handleSubmit() {
      this.$store.commit('loginbackend/setMdict', this.isMdict);
      if(this.isObserver) {
        this.$store.commit("session/setWatcher", true);
        this.$store.dispatch("loginbackend/observeSession", {sessionId: this.room});
      }else{
        this.$store.commit("session/setWatcher", false);
        this.$store.dispatch("loginbackend/joinSession", {sessionId: this.room});
      }
      
      //this.$store.commit('loginbackend/setSessionId', this.room);
    },

    logout() {
      // 清除登录状态
      this.$store.commit('loginbackend/logout', "");
    }
  }
};
</script>

<style scoped>

.login-container {
  max-width: 500px;
  margin: 50px auto;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  text-align: center;
}

.title {
    text-align: center;
    margin-bottom: 1rem;
    color: black;
    max-width: 400px;      /* 你可以根据需要调整宽度 */
    white-space: pre-wrap; /* 保证换行 */
    word-break: break-all; /* 长单词也会换行 */
    overflow-wrap: break-word;
  }
  
.blackp {
  font-size: 0.9rem;
  color: black;
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.login-form input {
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
}

.login-form button {
  padding: 0.5rem;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
}

.login-form button:hover {
  background-color: #369f74;
}

.logout-button {
  margin-top: 1rem;
  padding: 0.5rem;
  background-color: #ff4d4f;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
}

.logout-button:hover {
  background-color: #d9363e;
}
</style>
