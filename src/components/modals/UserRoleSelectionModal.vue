<template>
  <Modal :closable="false"
    class="user-role-selection"
    v-if="modals.userRoleSelection"
  >
    <h3>{{ session.isSpectator ? "选择角色并提交给说书人" : "定制剧本中" }}</h3>

    <div class="content-container" :class="{ 'single-panel': session.isSpectator }">
      <!-- 左侧：用户列表滚动窗口 - 仅主端可见 -->
      <div class="left-panel" v-if="!session.isSpectator">
        <div class="panel-title">来自玩家的角色 ({{ totalSelectedRoles }})</div>
        <div class="scroll-wrapper">
          <div
            class="user-card"
            v-for="user in users"
            :key="user.id"
            :class="{ 'has-selected': getUserSelectedCount(user) > 0 }"
          >
            <div class="user-header">
              <div class="user-name">{{ user.name }}</div>
              <div
                class="reselect-button"
                @click="requestReselect(user)"
                title="要求玩家重选角色"
              >
                要求重选
              </div>
            </div>
            <ul class="user-tokens">
              <li
                v-for="role in user.roles"
                :key="role.id"
                :class="[role.team, role.selected ? 'selected' : '']"
                @click="toggleRoleSelection(role, user)"
              >
                <Token :role="role" />
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 右侧：可选角色滚动窗口 -->
      <div class="right-panel" :class="{ 'full-width': session.isSpectator }">
        <div class="panel-title"> {{session.isSpectator ? "选择角色并提交" : "说书人补充角色"}}</div>
        <div class="scroll-wrapper">
          <ul class="available-tokens">
            <li
              v-for="role in availableRoles"
              :key="role.id"
              :class="[role.team, role.selected ? 'selected' : '']"
              @click="toggleRoleSelection(role)"
            >
              <Token :role="role" />
              <font-awesome-icon icon="exclamation-triangle" v-if="role.setup" />
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="button-group">
      <div class="button" @click="onConfirm" :class="{ disabled: !canConfirm }">
        <font-awesome-icon icon="file-upload" />
        确定
      </div>
      <div class="button cancel" @click="onCancel" v-if="!session.isSpectator">
        <font-awesome-icon icon="cog" />
        取消
      </div>
      <div class="button cancel" @click="wakeupAllPlayer" v-if="!session.isSpectator">
        有玩家未显示选角色窗口？点此再次唤起
      </div>
    </div>

  </Modal>
</template>

<script>
import Modal from "./Modal";
import Token from "./../Token";
import { mapGetters, mapMutations, mapState } from "vuex";

export default {
  components: {
    Token,
    Modal,
  },
  data: function () {
    return {
      // availableRoles 格式: Array<Role>
      // 所有可选的角色，放在右侧供选择，可以由外部设置
      availableRoles: [],
    };
  },
  computed: {
    // users 从 store 获取，由各个从端玩家提交
    users: function () {
      return this.$store.getters['chat/allUserRoleSelections'];
    },
    // 计算左侧所有用户选中的角色总数
    totalSelectedRoles: function () {
      return this.users.reduce((total, user) => {
        return total + user.roles.filter(r => r.selected).length;
      }, 0);
    },
    // 计算右侧可选角色中选中的数量
    availableSelectedCount: function () {
      return this.availableRoles.filter(r => r.selected).length;
    },
    // 是否可以确认：从端必须选中至少一个角色才能确认关闭
    canConfirm: function () {
      if (this.session.isSpectator) {
        return this.availableSelectedCount > 0;
      }
      // 主端随时可以确认
      return true;
    },
    ...mapState(["roles", "modals", "session", "edition"]),
    ...mapState("chat", ["userRoleSelections"]),
    ...mapState("loginbackend", ["playerId", "username"]),

    ...mapState(["fabled"]),
  },
  methods: {
    // 初始化右侧可选角色，从全局 this.roles 来
    initAvailableRoles: function () {
      this.availableRoles = [];
      this.roles.forEach((role) => {
        // 复制角色对象并添加 selected 属性
        const roleCopy = { ...role };
        this.$set(roleCopy, "selected", false);
        this.availableRoles.push(roleCopy);
      });
    },
    // ========== 公共方法 ==========
    // 切换角色选中状态
    toggleRoleSelection(role, user = null) {
      // 使用 Vue.set 确保响应式
      this.$set(role, "selected", !role.selected);
      // 如果需要在选中时做额外处理，可以在这里扩展
      this.onRoleToggled(role, user);
    },

    // 获取某个用户已选中的角色数量
    getUserSelectedCount(user) {
      return user.roles.filter(r => r.selected).length;
    },

    // 清空所有选择
    onClearAll() {
      this.users.forEach(user => {
        user.roles.forEach(role => {
          role.selected = false;
        });
      });
      this.availableRoles.forEach(role => {
        role.selected = false;
      });
    },

    onCancel() {
      this.toggleModal('userRoleSelection');
      const command = {
        "header": "sync",
        "command": "setModal",
        "param": {
          name: "userRoleSelection",
          open: false
        }
      };
      this.$store.commit("session/sendCommand", command);
    },
    // 确定按钮点击 - 区分主端从端逻辑
    onConfirm() {
      const selectionResult = this.getSelectionResult();
      if (this.session.isSpectator) {
        // ========== 从端逻辑：发送选择给主端 ==========
        // 从端只在右侧选择，取右侧选中的角色
        const selectedRoles = selectionResult.availableRoles.selected;

        let command = {
          "header": "request",
          "receiver": "host",
          "command": "chat/submitUserSelectRole",
          "param": {
            id: this.playerId, // 这个是当前用户的id
            name: this.username, // 这个是当前用户的名字
            selectedRoles: selectedRoles.map(r => ({
              id: r.id,
              name: r.name,
              team: r.team,
              ability: r.ability,
              image: r.image,
              imageAlt: r.imageAlt,
              firstNight: r.firstNight,
              firstNightReminder: r.firstNightReminder,
              otherNight: r.otherNight,
              otherNightReminder: r.otherNightReminder,
              reminders: r.reminders,
              setup: r.setup || false,
              edition: r.edition
            }))
          },
        };
        this.$store.commit("session/sendCommand", command);
        // 提交后清空所有选中，不关闭弹窗 - 可以重新选择再次提交
        this.onClearAll();
      } else {
        // ========== 主端逻辑：收集所有选中的角色 ==========
        // 主端需要：
        // 1. 收集左侧每个用户已经选中的角色
        // 2. 收集右侧额外补充选中的角色
        // 3. 通过 setCustomRoles 和 setEdition 完成角色设置
        const allSelectedRoles = selectionResult.allSelectedRoles;

        // 提取纯角色数据，只保留必要信息，类似 EditionModal parseRoles
        const roles = allSelectedRoles.map(role => {
          return {
            id: role.id,
            name: role.name,
            team: role.team,
            ability: role.ability,
            image: role.image,
            imageAlt: role.imageAlt,
            firstNight: role.firstNight,
            firstNightReminder: role.firstNightReminder,
            otherNight: role.otherNight,
            otherNightReminder: role.otherNightReminder,
            reminders: role.reminders,
            setup: role.setup,
            edition: role.edition
          };
        });

        // 设置自定义角色
        this.setCustomRoles(roles);

        // 使用当前已有的 meta 信息，设置 edition
        const meta = this.edition || {};
        meta["name"] = "一个超酷的剧本！"
        meta["author"] = "所有玩家"
        this.setEdition(Object.assign({}, meta, { id: "custom" }));

        // 检查并设置 fabled，和 EditionModal 保持一致
        if (roles.some(role => this.fabled.has(role.id))) {
          const fabled = [];
          roles.forEach(role => {
            if (this.fabled.has(role.id)) {
              fabled.push(this.fabled.get(role.id));
            }
          });
          this.$store.commit("players/setFabled", { fabled });
        }

        const command = {
          "header": "sync",
          "command": "setModal",
          "param": {
            name: "userRoleSelection",
            open: false
          }
        };
        this.$store.commit("session/sendCommand", command);

        this.onConfirmCallback(this.getSelectionResult());
        this.toggleModal('userRoleSelection');
      }
    },

    // ========== 预留钩子函数 - 方便外部扩展 ==========
    // 当某个角色被点击切换选中状态时调用
    onRoleToggled(role, user) {
      // 外部可以通过 $refs 重写或者继承覆盖
      // 默认空实现
    },

    // 确认回调 - 你需要实现这个方法来处理选择结果
    onConfirmCallback(selectionResult) {
      // 结果格式:
      // {
      //   users: Array<{
      //     id: string|number,   // 从端玩家ID
      //     name: string,        // 从端玩家名称
      //     allRoles: Array<Role>,  // 该从端提交的所有角色
      //     selectedRoles: Array<Role> // 该从端提交中被主端选中的角色
      //   }>,
      //   availableRoles: {
      //     all: Array<Role>,    // 所有可选角色
      //     selected: Array<Role> // 主端在右侧额外补充选中的角色
      //   },
      //   allSelectedRoles: Array<Role>, // 所有选中角色的完整列表（左侧+右侧）
      //   totalSelected: number  // 总共选中数量
      // }
      // 你可以直接使用 selectionResult.allSelectedRoles 进入后续逻辑
      console.log('Selection result:', selectionResult);
    },

    // ========= 工具方法：获取完整选择结果 ==========
    // 结果包含:
    // 1. users: 所有从端玩家提交上来的信息，每个玩家及其选中角色
    // 2. availableRoles.selected: 主端在右侧额外补充选中的角色
    // 3. allSelectedRoles: 所有选中角色的扁平化列表（左侧+右侧）
    getSelectionResult() {
      const leftSelected = this.users.reduce((list, user) => {
        return [...list, ...user.roles.filter(r => r.selected)];
      }, []);
      const rightSelected = this.availableRoles.filter(r => r.selected);

      return {
        users: this.users.map(user => ({
          id: user.id,
          name: user.name,
          allRoles: user.roles,
          selectedRoles: user.roles.filter(r => r.selected)
        })),
        availableRoles: {
          all: this.availableRoles,
          selected: rightSelected
        },
        allSelectedRoles: [...leftSelected, ...rightSelected],
        totalSelected: leftSelected.length + rightSelected.length
      };
    },

    // ========== 清空所有玩家提交的数据 ==========
    clearAllUserData() {
      this.$store.commit('chat/clearUserSelectRoles');
    },

    // ========== 主端：要求某个玩家重选 ==========
    requestReselect(user) {
      // 1. 从 store 中删除该用户的提交
      this.$store.commit('chat/removeUserSelectRole', { userId: user.id });

      // 2. 发送指令给对端，要求打开弹窗重新选择
      const command = {
        "header": "require",
        "receiver": user.id,
        "command": "setModal",
        "param": {
          name: "userRoleSelection",
          open: true
        }
      };
      this.$store.commit("session/sendCommand", command);
    },
    wakeupAllPlayer() {
      const command = {
              "header": "sync",
              "command": "setModal",
              "param": {
                name: "userRoleSelection",
                open: true
              }
            };
            this.$store.commit("session/sendCommand", command);
    },

    ...mapMutations(["toggleModal", "setCustomRoles", "setEdition"]),
  },
  mounted: function () {
    this.initAvailableRoles();
  },
  watch: {
    // 当 roles 变化时重新初始化
    roles() {
      this.initAvailableRoles();
    },
    // 当主端打开此弹窗时，同步通知房间内所有玩家打开此弹窗
    "modals.userRoleSelection": function(isOpen) {
      if (!this.session.isSpectator && isOpen) {
        // 获取当前房间所有成员
        this.wakeupAllPlayer();
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "../../vars.scss";

.content-container {
  display: flex;
  gap: 10px;
  max-height: 65vh;
  margin: 10px 0;
}

.left-panel {
  flex: 1;
  min-width: 40%;
  max-width: 40%;
  display: flex;
  flex-direction: column;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;

  &.full-width {
    flex: 1;
    width: 100%;
    max-width: 100%;
  }
}

.content-container.single-panel {
  display: flex;

  .right-panel {
    width: 100%;
    max-width: 100%;
  }
}

.panel-title {
  font-weight: bold;
  margin-bottom: 8px;
  color: #fff;
  font-size: 14px;
}

.scroll-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 10px;
}

.scroll-wrapper::-webkit-scrollbar {
  width: 6px;
}

.scroll-wrapper::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

/* ========== 左侧用户卡片样式 ========== */
.user-card {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);

  &:last-child {
    margin-bottom: 0;
  }

  &.has-selected {
    border-color: rgba(80, 200, 80, 0.5);
    background-color: rgba(80, 200, 80, 0.08);
  }
}

.user-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 5px;
}

.user-name {
  font-weight: bold;
  color: #fff;
  font-size: 16px;
}

.reselect-button {
  padding: 4px 8px;
  background-color: rgba(255, 100, 100, 0.2);
  border: 1px solid rgba(255, 100, 100, 0.5);
  border-radius: 4px;
  color: #ff8888;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 200ms;

  &:hover {
    background-color: rgba(255, 100, 100, 0.4);
    color: #fff;
  }

  svg {
    font-size: 12px;
  }
}

.user-tokens {
  list-style-type: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  align-items: center;
  justify-content: flex-start;
  line-height: 100%;
}

/* ========== 右侧可选角色样式 ========== */
.available-tokens {
  list-style-type: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  align-items: center;
  justify-content: center;
  line-height: 100%;
}

/* ========== Token 通用样式 ========== */
.user-tokens li,
.available-tokens li {
  border-radius: 50%;
  width: 8vw;
  max-width: 80px;
  min-width: 50px
  margin: 3px;
  opacity: 0.5;
  transition: all 250ms;
  position: relative;

  &.selected {
    opacity: 1;
    .fa-exclamation-triangle {
      display: block;
    }
  }

  &.townsfolk {
    box-shadow:
      0 0 10px $townsfolk,
      0 0 10px #004cff;
  }
  &.outsider {
    box-shadow:
      0 0 10px $outsider,
      0 0 10px $outsider;
  }
  &.minion {
    box-shadow:
      0 0 10px $minion,
      0 0 10px $minion;
  }
  &.demon {
    box-shadow:
      0 0 10px $demon,
      0 0 10px $demon;
  }
  &.traveler {
    box-shadow:
      0 0 10px $traveler,
      0 0 10px $traveler;
  }

  &:hover {
    transform: scale(1.15);
    z-index: 10;
  }

  .fa-exclamation-triangle {
    position: absolute;
    color: red;
    filter: drop-shadow(0 0 3px black) drop-shadow(0 0 3px black);
    top: 5px;
    right: -5px;
    font-size: 150%;
    display: none;
  }
}

/* ========== 自适应调整 ========== */
.user-role-selection .modal {
  max-width: 85%;
  max-height: 75%;
}

/* 从端全屏时调整最大尺寸 */
.user-role-selection.content-container.single-panel .right-panel {
  max-width: 100%;
  min-width: 100%;
}
</style>
