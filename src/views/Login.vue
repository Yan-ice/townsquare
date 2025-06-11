<template>
    <div class="login-container">
      <h2 class="title">用户登录</h2>
      <form @submit.prevent="handleSubmit" class="login-form">
        <input v-model="username" type="text" placeholder="用户名" required />
        <input v-model="password" type="password" placeholder="密码" required />
        <input :disabled="$store.state.loginbackend.backendServer" v-model="serverurl" type="text" placeholder="区服" required />
        <button :disabled="$store.state.loginbackend.username!=''" type="submit">确认</button>
      </form>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        username: '',
        password: '',
        serverurl: '',
      }
    },

    methods: {
      handleSubmit() {
        this.$store.commit('loginbackend/setServerURL', this.serverurl);

        this.$store.commit('loginbackend/setPlayerId', '');
        // 传递对象给 mutation
        this.$store.commit('loginbackend/loginWithData', {
          username: this.username,
          password: this.password
        });

        // 这里你可以调用接口或做其他操作
      }
    }
  }
  </script>
  
  <style scoped>
  /* 样式保持不变 */
  .login-container {
    max-width: 400px;
    margin: 80px auto;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    background-color: #fff;
  }
  
  .title {
    text-align: center;
    margin-bottom: 1.5rem;
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
  </style>
  