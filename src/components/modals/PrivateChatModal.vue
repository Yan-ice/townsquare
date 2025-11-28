<template>
  <Modal :closable="false" v-if="modals.privateChat" @close="endPrivChat">

    <h3>
      你正在 {{ roomHostName }} 的私聊房间。
    </h3>
    <h3 v-if="isRoomHost">
      点击申请者的名字，即可同意其参与你们的私聊。
    </h3>
    <br>
      <div v-if="isApplying">
        <h1> 正在等待房主同意加入私聊</h1>
      </div>
      <div class="member-list" v-if="!isApplying">
        <PlayerShow
          v-for="uid in [...myRoomMember, ...myRoomApplier]"
          :key="uid"
          :player="uidToPlayer(uid)"
          :roleth="1"
        />
      </div>

    <div class="button-group">

      <div v-if="chat.isMute" class="button demon" @click="toggleMute">
        <font-awesome-icon icon="volume-up" /> 开启麦克风
      </div>

      <div v-if="!chat.isMute" class="button demon" @click="toggleMute">
        <font-awesome-icon icon="volume-mute" /> 关闭麦克风
      </div>

      <div class="button demon" @click="endPrivChat">
        <font-awesome-icon icon="cog" /> 离开私聊房间
      </div>

    </div>

  </Modal>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
import PlayerShow from "../PlayerShow.vue";
export default {
  components: { 
    Modal,
    PlayerShow
  },
  computed: {
    ...mapState(["modals", "fabled", "grimoire", "loginbackend", "chat"]),
    chat() {
      return this.$store.state.chat;
    },
    uidToPlayer() {
      return this.$store.getters["players/uidToPlayer"];
    },
    isRoomHost() {
      return this.$store.getters["chat/isRoomHost"];
    },
    isApplying() {
      return this.$store.getters["chat/isApplying"];
    },
    // myRoomId getter
    myRoomId() {
      return this.$store.getters["chat/myRoomId"];
    },

    // 当前房主名字
    roomHostName() {
      if (!this.myRoomId) return "未知用户";
      console.log("uid is: "+this.myRoomId)
      const player = this.$store.getters["players/uidToPlayer"](this.myRoomId)
      if (player) return player.name
      return "未知玩家";
    },

    // 成员列表
    myRoomMember() {
      if (!this.myRoomId) return [];
      const v = this.$store.getters["chat/myRoomMember"];
      return v || [];
    },

    // 申请者列表
    myRoomApplier() {
      if (!this.myRoomId) return [];
      const v = this.$store.getters["chat/myRoomApplier"];
      return v || [];
    },
  },
  methods: {
    endPrivChat() {
      this.$store.commit("toggleModal", "");
      let command = {
            "header": "request",
            "receiver": "host",
            "command": "chat/leaveChatChannel",
            "param": {
              "userId": this.$store.state.loginbackend.playerId
            },
          }
          this.$store.commit("session/sendCommand", command);
    },
    toggleMute() {
      this.$store.commit("chat/toggleMute");
      // this.$store.commit("toggleModal", "");
    },
    // ✨ 预留接口：你自己实现 id → name 的逻辑
    getNameById(uid) {
      // 示例写法，你未来替换成真实逻辑即可
      // 例如：return this.$store.state.players[uid].name;
      return "用户 " + uid;
    },
    ...mapMutations(["toggleModal"]),
  },
};
</script>

<style scoped lang="scss">
@import "../../vars.scss";

h3 {
  margin: 0 40px;
}

textarea {
  background: transparent;
  color: white;
  white-space: pre-wrap;
  word-break: break-all;
  border: 1px solid rgba(255, 255, 255, 0.5);
  width: 60vw;
  height: 30vh;
  max-width: 100%;
  margin: 5px 0;
}

.member-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); // 每个格子最小100px，自动填充
  grid-gap: 12px;       // 格子间距
  justify-items: center; // 水平居中
  align-items: center;   // 垂直居中
  width: 100%;
  max-width: 30vh;     // 可选：限制最大宽度
  min-width: 50vh;
  max-height: 40vh;
  min-height: 20vh;
  margin: 0 auto;       // 容器居中
  padding: 10px;
}

</style>
