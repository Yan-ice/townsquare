<template>
  <Modal v-if="modals.message" @close="closeWin">
  <h3>与 {{playerByIndex(currentChatIndex).name}} 的聊天</h3>
  <textarea
      v-model="playerByIndex(currentChatIndex).messageLogWithHim" readonly
  ></textarea>
  <div class="chat-input">
      <input
        type="text"
        v-model="inputMessage"
        @keyup.enter="sendMessage"
        placeholder="输入消息..."
      />
      <div class="button send" @click="sendMessage">
        <font-awesome-icon icon="paper-plane" /> 发送
      </div>
  </div>

  <!-- <div class="button-group">
      <div class="button demon" @click="closeWin">
        <font-awesome-icon icon="cog" /> 关闭
      </div>
  </div> -->
  </Modal>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
export default {
  components: { Modal },
  data() {
    return {
      inputMessage: "",
    };
  },
  computed: {
    ...mapState(["modals", "loginbackend", "players"]),
    currentChatIndex() {
      return this.loginbackend.currentChatIndex;
    },
    playerByIndex() {
      return (index) => this.$store.getters["players/indexToPlayer"](index);
    }
  },
  methods: {
    closeWin() {
      this.$store.commit("players/checkMes", {sender: this.currentChatIndex});
      this.toggleModal('message');
    },
    sendMessage() {
      const content = this.inputMessage.trim();
      if (!content) return;
      this.$store.commit("players/updateMes", {sender: this.playerByIndex(this.currentChatIndex).id, tellerName: this.loginbackend.username,  message: content});
      this.$store.commit("loginbackend/tellMes", {receiver: this.playerByIndex(this.currentChatIndex).id, message: content});
      
      this.inputMessage = "";
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

.chat-input {
  display: flex;
  margin-top: 10px;
}

.chat-input input {
  flex-grow: 1;
  font-size: 1em;
}

</style>
