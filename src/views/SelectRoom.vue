<template>
  <div class="login-container">
    <div class="content-wrapper">
      <!-- 左侧：房间表单 -->
      <div class="left-panel">
        <h2 class="title">线上游戏</h2>
        <form @submit.prevent="handleSubmit" class="login-form">
          <input v-model="room" type="text" placeholder="请输入房间号" required />
          <button type="submit">
            {{ $store.state.loginbackend.canStoryteller ? "创建/加入房间" : "加入房间" }}
          </button>

          <label class="observer-checkbox blackp">
            <input v-model="isObserver" type="checkbox" />
            以旁观身份加入
          </label>

          <label
            v-if="$store.state.loginbackend.canStoryteller"
            class="observer-checkbox blackp"
          >
            <input v-model="isMdict" type="checkbox" />
            开启内置语音
          </label>
        </form>
      </div>

      <!-- 右侧：离线房间按钮 -->
      <div class="right-panel">
        <h2 class="title"> 线下说书 </h2>
        <form @submit.prevent="handleOfflineRoom" class="login-form">

        <button type="submit">
          创建离线房间
        </button>
        <!-- <p class="title blackp">注：该功能为线下使用电子魔典说书专用。</p> -->
        </form>
      </div>
    </div>

    <!-- 底部：退出和提示 -->
    <div class="user-bar">    
      <h2 class="blackp">当前用户：{{ username }}</h2>
      <button class="logout-button" @click="logout">退出登录</button>
    </div>

    <p v-if="$store.state.dialog.message" class="title blackp">
      {{ $store.state.dialog.message }}
    </p>
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
      isMdict: false
    };
  },

  methods: {
    handleSubmit() {
      //this.$store.commit('loginbackend/setMdict', this.isMdict);
      if(this.isObserver) {
        this.$store.commit("session/setWatcher", true);
        this.$store.dispatch("loginbackend/observeSession", {sessionId: this.room});
      }else{
        this.$store.commit("session/setWatcher", false);
        this.$store.dispatch("loginbackend/joinSession", {sessionId: this.room, mdict: this.isMdict});
      }
      
      //this.$store.commit('loginbackend/setSessionId', this.room);
    },
    handleOfflineRoom() {
        this.$store.commit("session/setWatcher", false);
        this.$store.dispatch("loginbackend/joinSession", {sessionId: "__offline__", mdict: this.isMdict});
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
  max-width: 550px;
  margin: 30px auto;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  text-align: center;
}


.content-wrapper {
  display: flex;
  justify-content: space-between;
}

.left-panel,
.right-panel {
  flex: 1;
  width: 230px;
  padding: 20px;
}

.left-panel {
  border-right: 1px solid #ddd;
}

.right-panel {
  text-align: center;
}

.user-bar {
  display: flex;
  justify-content: center; /* 水平方向居中 */
  align-items: center;     /* 垂直方向居中 */
  gap: 20px;               /* 元素之间留点间距 */
  margin: 20px 0;          /* 上下留白 */
}

.title {
    text-align: center;
    margin-bottom: 1rem;
    color: black;
    max-width: 550px;      /* 你可以根据需要调整宽度 */
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
