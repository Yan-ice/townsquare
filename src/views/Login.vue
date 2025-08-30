<template>
  <div class="login-container">
    <div class="login-columns">
      <!-- 左栏：玩家登录 -->
      <div class="login-column player-login">
        <h2 class="title">游客登录</h2>
        <div class="input-group">
          <input v-model="playerUsername" type="text" placeholder="昵称" />
          <button @click="handlePlayerLogin">登录</button>
        </div>
      </div>

      <!-- 右栏：统一认证登录 -->
      <div class="login-column system-login">
        <h2 class="title">统一认证登录</h2>
        <button class="circle-btn" @click="redirectToLogin">
          <em><font-awesome-icon icon="key" /></em>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
axios.defaults.withCredentials = true;

export default {
  data() {
    return {
      playerUsername: '',
    }
  },  
  mounted() {
    this.tryLoginWithSystemMe();
  },
  methods: {
    async tryLoginWithSystemMe() {
      this.$store.commit('loginbackend/setServerURL', 'yanices.site');
      try {
        console.log("尝试统一认证登录");
        const res = await axios.get("https://yanices.site/user/me");
        if (res.data.status === "success") {
          this.$store.commit('loginbackend/loginWithSystemMe', res.data);
        }
      } catch (err) {
        console.log("请求失败或未登录", err);
      }
      console.log("未登录，尝试游客登录模式");
      this.$store.commit('loginbackend/loginWithStorage');
    },
    handlePlayerLogin() {
      this.$store.commit('loginbackend/setServerURL', 'yanices.site');
      this.$store.commit('loginbackend/setPlayerId', '');
      this.$store.commit('loginbackend/loginWithData', {
        username: this.playerUsername,
        pwd: "__guest__"
      });
    },
    redirectToLogin() {
      window.location.href = 'https://yanices.site/user/';
    }
  }
}
</script>

<style scoped>
/* 容器 */
.login-container {
  max-width: 600px;
  margin: 80px auto;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  background-color: #fff;
  display: flex;
  justify-content: center;
}

/* 两栏布局 */
.login-columns {
  display: flex;
  align-items: flex-start; /* 默认顶部对齐 */
  position: relative;
}

/* 中间竖线分割 */
.login-columns::before {
  content: '';
  position: absolute;
  width: 2px;
  height: 70%;
  background-color: #ccc;
  left: 50%;
  top: 15%;
  transform: translateX(-50%);
}

/* 左右栏统一 */
.login-column {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  z-index: 1; /* 避免被竖线覆盖 */
}

/* 保证标题与另一栏同一高度 */
.login-column .title {
  text-align: center;
  color: #333;
  font-weight: 600;
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  /* 强制高度一致 */
  min-height: 32px;
  display: flex;
  align-items: center;
}

/* 玩家输入组合 */
.player-login .input-group {
  display: flex;
  width: 140px; /* 适当加宽 */
  flex-direction: column;
  gap: 0.5rem;
}

.player-login input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 0.95rem;
  width: 100%;
  height: 45px; /* 适中高度 */
}

.player-login button {
  padding: 0.5rem;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  height: 45px; /* 与输入框一致 */
}

.player-login button:hover {
  background-color: #369f74;
}

/* 统一认证圆形按钮 */
.system-login .circle-btn {
  width: 100px;  /* 加大 */
  height: 100px; /* 加大 */
  border-radius: 50%;
  background-color: #42b983;
  color: white;
  border: none;
  font-size: 3rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s;
}

.system-login .circle-btn:hover {
  background-color: #369f74;
}

/* Font Awesome Icon 样式 */
.system-login .circle-btn i {
  pointer-events: none;
}
</style>
