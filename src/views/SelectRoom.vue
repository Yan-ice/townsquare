<template>
  <div class="login-container">
    <h2 class="title">欢迎，{{ username }}</h2>

    <form @submit.prevent="handleSubmit" class="login-form">
      <input v-model="room" type="text" placeholder="请输入房间号" required />
      <button type="submit">确认</button>
    </form>

    <button class="logout-button" @click="logout">退出登录</button>
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
      room: ''
    };
  },

  methods: {
    handleSubmit() {
      this.$store.commit('loginbackend/setSessionId', this.room);
      
    },

    logout() {
      // 清除登录状态
      this.$store.commit('loginbackend/setPlayerId', "");
    }
  }
};
</script>

<style scoped>

.login-container {
  max-width: 400px;
  margin: 80px auto;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  text-align: center;
}

.title {
  font-size: 1.5rem;
  margin-bottom: 2rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-form input {
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
}

.login-form button {
  padding: 0.75rem;
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
  margin-top: 1.5rem;
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
