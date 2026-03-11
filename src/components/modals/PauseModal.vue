<template>
    <Modal :closable="false" v-if="session.paused">
      <h3>房间已暂停</h3>
      <p>该房间说书人处于离线状态，房间已暂停。请等待说书人重新上线。</p>

      <div class="button-group">
        <div class="button" @click="leaveRoom">
          <font-awesome-icon icon="times-circle" />
          退出房间
        </div>
      </div>
    </Modal>
  </template>
  
  <script>
  import Modal from "./Modal";
  import { mapState, mapMutations } from "vuex";
  
  export default {
    components: { Modal },
    computed: {
        ...mapState(["modals", "dialog", "session", "grimoire", "loginbackend"]),
    },

    methods: {
      ...mapMutations(["setDialog", "toggleModal"]),
      leaveRoom() {
        this.$store.dispatch("loginbackend/leaveSession");
        this.$store.commit("toggleModal", "");
      }
    },
  };
  </script>
  
  <style scoped lang="scss">
  h3 {
    margin: 0 20px;
  }
  textarea {
    width: 90%;
    height: 60px;
    background: #111;
    color: #fff;
    margin: 10px 0;
  }
  </style>
  