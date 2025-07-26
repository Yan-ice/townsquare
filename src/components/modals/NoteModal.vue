<template>
  <Modal v-if="modals.notes" @close="closeNote">
    <h3>笔记本</h3>
    <textarea
      v-model="notesContent"
      placeholder="你的笔记本"
    ></textarea>
    <div class="button-group">
      <div class="button demon" @click="closeNote">
        <font-awesome-icon icon="cog" /> 关闭
      </div>
    </div>
  </Modal>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";

export default {
  name: "NoteModal",
  components: { Modal },
  data() {
    return {
      notesContent: ""
    };
  },
  computed: {
    ...mapState(["modals", "loginbackend"]),
  },
  watch: {
    'modals.notes'(val) {
      this.notesContent = this.loginbackend.selfNotes || '';
    }
  },
  methods: {
    closeNote() {
      this.$store.commit("loginbackend/setNotes", this.notesContent);
      this.toggleModal("notes");
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
  word-break: break-word;
  border: 1px solid rgba(255, 255, 255, 0.5);
  width: 50vw;
  height: 50vh;
  max-width: 100%;
  margin: 5px 0;
  padding: 10px;
  font-size: 1em;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
</style>
