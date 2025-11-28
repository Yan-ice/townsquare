<template>
  <Modal :closable="false" v-if="modals.privateChat" @close="endPrivChat">

    <h3>
      你正在 {{ roomHostName }} 的私聊房间。
    </h3>
    <h3 v-if="isRoomHost">
      点击申请者的名字，即可同意其参与你们的私聊。
    </h3>
    <br>

      <div class="member-list">
        <!-- 1. 渲染真正的成员 -->
        <template v-for="uid in myRoomMember">
          <PlayerShow
            v-if="uidToPlayer(uid)"
            :key="'member-' + uid"
            :player="uidToPlayer(uid)"
            :roleth="1"
            :darken="false"
          />
        </template>

        <!-- 2. 渲染申请者（灰暗） -->
        <template v-for="uid in myRoomApplier">
          <PlayerShow
            v-if="uidToPlayer(uid)"
            :key="'applier-' + uid"
            :player="uidToPlayer(uid)"
            :roleth="1"
            :darken="true"
          />
        </template>

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
      return this.$store.getters["player/uidToPlayer"];
    },
    isRoomHost() {
      return this.$store.getters["chat/isRoomHost"];
    },
    // myRoomId getter
    myRoomId() {
      return this.$store.getters["chat/myRoomId"];
    },

    // 当前房主名字
    roomHostName() {
      if (!this.myRoomId) return "未知用户";
      const player = this.$store.getters["player/uidToPlayer"](myRoomId())
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
              "userId": this.$store.getters["chat/myRoomId"]
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

</style>
