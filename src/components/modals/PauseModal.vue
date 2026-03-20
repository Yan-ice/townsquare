<template>
  <Modal :closable="false" v-if="session.paused">
    <h3>房间已暂停</h3>
    
    <template v-if="!isConfirming">
      <p>该房间说书人处于离线状态，房间已暂停。请等待说书人重新上线。</p>
      <div class="button-group">
        <div class="button" @click="isConfirming = true">
          <font-awesome-icon icon="times-circle" />
          退出房间
        </div>
      </div>
    </template>

    <template v-else>
      <p style="color: #ff4d4f; font-weight: bold;">确认要退出房间吗？进度将会丢失！</p>
      <div class="button-group">
        <div class="button secondary" @click="isConfirming = false">
          取消
        </div>
        <div class="button danger" @click="confirmLeave">
          确认退出
        </div>
      </div>
    </template>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import { mapState, mapMutations } from "vuex";

export default {
  components: { Modal },
  data() {
    return {
      // 内部状态：是否处于确认退出阶段
      isConfirming: false,
    };
  },
  computed: {
    ...mapState(["modals", "dialog", "session", "grimoire", "loginbackend"]),
    // 提取暂停状态以便监听
    isPaused() {
      return this.session.paused;
    }
  },
  watch: {
    // 当房间暂停状态改变时（特别是从 false 变为 true 时）
    isPaused(newVal) {
      if (newVal) {
        this.isConfirming = false; // 自动恢复基础页面
      }
    }
  },
  methods: {
    ...mapMutations(["setDialog", "toggleModal"]),
    confirmLeave() {
      this.$store.dispatch("loginbackend/leaveSession");
      this.$store.commit("toggleModal", "");
      // 退出后重置状态，防止下次进入其他房间时残留
      this.isConfirming = false;
    }
  },
};
</script>

<style scoped lang="scss">
h3 {
  margin: 0 20px;
}
.button-group {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 15px;
}
.button {
  /* 保持原有样式 */
  &.danger {
    background: #841616;
  }
  &.secondary {
    background: #444;
  }
}
</style>