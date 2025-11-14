<template>
    <Modal :closable="false" v-if="modals.prompt" @close="onCancel">
      <h3>{{ dialog.title }}</h3>
      <p>{{ dialog.message }}</p>
  
      <textarea
        v-if="dialog.type === 'prompt'"
        v-model="promptInput"
        rows="3"
        placeholder="请输入内容"
      ></textarea>
  
      <div class="button-group">
        <div class="button demon" @click="onConfirm">
          确认
        </div>
        <div
          v-if="dialog.type !== 'alert'"
          class="button demon"
          @click="onCancel"
        >
          取消
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
        ...mapState(["modals", "dialog", "fabled", "grimoire", "loginbackend"]),
    },
    data() {
      return {
        promptInput: "",
      };
    },
    methods: {
      ...mapMutations(["setDialog", "toggleModal"]),

      resetData() {
        // 重置你所有 data 中的字段
        this.promptInput = "";
      },
      onConfirm() {
        if (this.dialog.resolve) {
          if (this.dialog.type === "prompt") {
            this.dialog.resolve(this.promptInput);
          } else {
            this.dialog.resolve(true);
          }
        }
        this.closeDialog();
      },
      onCancel() {
        if (this.dialog.resolve) {
          this.dialog.type === "prompt"
            ? this.dialog.resolve(null)
            : this.dialog.resolve(false);
        }
        this.closeDialog();
      },
      
      closeDialog() {
        this.setDialog({
          visible: false,
          message: "",
          title: "",
          type: "alert",
          resolve: null,
        });
        this.toggleModal("");
      }
    },
    watch: {
      "modals.showInfo"(val) {
        if (val) {
          this.resetData();   // 每次打开时清空 data
        }
      },
    }
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
  