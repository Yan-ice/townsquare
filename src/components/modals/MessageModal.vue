<template>
  <Modal v-if="modals.message" @close="toggleModal('message')">
  <h3>聊天记录</h3>
  <textarea
      v-model="loginbackend.messageLog" readonly
  ></textarea>
  <div class="button-group">
      <div class="button demon" @click="toggleModal('message')">
        <font-awesome-icon icon="cog" /> 关闭
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
    ...mapState(["modals", "loginbackend"]),
  },
  methods: {
    endPrivChat() {
      this.$store.commit("session/privateChatLeave");
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
