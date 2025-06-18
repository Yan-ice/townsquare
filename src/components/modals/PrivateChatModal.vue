<template>
  <Modal :closable=false v-if="modals.privateChat" @close="endPrivChat">
  <h3>你正在尝试与 {{ this.$store.state.session.private_chat_target }} 私聊。</h3>
  <br>
  <h1>状态：{{ this.$store.state.session.private_chat_connected ? '私聊进行中' : '对方未接受' }}</h1>
  <!-- <h1>[{{ this.$store.state.session.private_chat_connected ? '已建立私聊频道' : '仍在公聊频道中' }}]</h1>
   -->
  <p>{{ !this.$store.state.session.private_chat_connected ? '同时让对方向你发起私聊，即可建立私聊连接。' : '如果你关闭这个窗口，你将结束私聊并回到公聊。' }}</p>
  

  <div class="button-group">
    <div v-if="loginbackend.isMute" class="button demon" @click="toggleMute(false)">
        <font-awesome-icon icon="volume-up" /> 开启麦克风
    </div>
    <div v-if="!loginbackend.isMute" class="button demon" @click="toggleMute(true)">
        <font-awesome-icon icon="volume-mute" /> 关闭麦克风
    </div>
    <div class="button demon" @click="endPrivChat">
        <font-awesome-icon icon="cog" /> 结束私聊
    </div>
  </div>
  </Modal>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
export default {
  components: { Modal },
  computed: {
    ...mapState(["modals", "fabled", "grimoire", "loginbackend"]),
  },
  methods: {
    endPrivChat() {
      this.$store.commit("toggleModal", "");
      this.$store.commit("session/privateChatLeave");
    },
    toggleMute(mute) {
      this.$store.commit("loginbackend/setMute",mute);
      // this.$store.commit("toggleModal", "");
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
