<template>
  <Modal
    class="roles"
    v-if="modals.roles && nonTravelers >= 5"
    @close="toggleModal('roles')"
  >
    <h3>选择要展示的内容：</h3>

    <div class="selector-wrapper">
      <!-- 左侧单选 -->
      <div class="left-panel">
        <ul>
          <li
            v-for="keyword in keywords"
            :key="keyword"
            :class="{ selected: selectedKeyword === keyword }"
            @click="selectedKeyword = keyword"
          >
            {{ keyword }}
          </li>
        </ul>
      </div>

      <!-- 右侧 -->
      <div class="right-panel">
        <!-- 上：角色多选 -->
        <div class="token-select scroll-wrapper">
          <ul
            class="tokens"
            v-for="(teamRoles, team) in roleSelection"
            :key="team"
          >
            <li
              v-for="role in teamRoles"
              :class="[role.team, role.selected ? 'selected' : '']"
              :key="role.id"
              @click="role.selected = role.selected ? 0 : 1"
            >
              <Token :role="role" />
              <font-awesome-icon
                icon="exclamation-triangle"
                v-if="role.setup"
              />
            </li>
          </ul>
        </div>

        <!-- 下：数字多选 -->
        <div class="number-grid">
          <div
            v-for="n in 16"
            :key="n"
            :class="['number-cell', selectedNumbers.includes(n) ? 'selected' : '']"
            @click="toggleNumber(n)"
          >
            {{ n }}
          </div>
        </div>
      </div>
    </div>

    <!-- 确认按钮 -->
    <div class="button-group">
      <div class="button" @click="confirmSelection">
        <font-awesome-icon icon="people-arrows" />
        确认
      </div>
    </div>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import Token from "./../Token";
import { mapGetters, mapMutations, mapState } from "vuex";

export default {
  components: { Token, Modal },
  data() {
    return {
      roleSelection: {},
      keywords: ["关键词A", "关键词B", "关键词C"], // 左侧关键词
      selectedKeyword: null,
      selectedNumbers: [],
    };
  },
  computed: {
    ...mapState(["roles", "modals", "grimoire"]),
    ...mapState("players", ["players"]),
    ...mapGetters({ nonTravelers: "players/nonTravelers" }),
  },
  methods: {
    toggleNumber(n) {
      if (this.selectedNumbers.includes(n)) {
        this.selectedNumbers = this.selectedNumbers.filter((x) => x !== n);
      } else {
        this.selectedNumbers.push(n);
      }
    },
    confirmSelection() {
      const roles = Object.values(this.roleSelection)
        .map((roles) =>
          roles.reduce((a, r) => [...a, ...Array(r.selected).fill(r)], [])
        )
        .reduce((a, b) => [...a, ...b], [])
        .map((a) => [Math.random(), a])
        .sort((a, b) => a[0] - b[0])
        .map((a) => a[1]);

      const result = {
        keyword: this.selectedKeyword,
        roles,
        numbers: this.selectedNumbers,
      };

      // TODO: 根据需要提交到 Vuex 或父组件
      console.log("最终选择结果：", result);

      this.$store.commit("toggleModal", "roles");
    },
    ...mapMutations(["toggleModal"]),
  },
};
</script>

<style lang="scss" scoped>
.selector-wrapper {
  display: flex;
  max-height: 70vh;
}

/* 左栏：单选关键词 */
.left-panel {
  flex: 0 0 120px;
  border-right: 1px solid #ccc;
  padding: 10px;

  ul {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      cursor: pointer;
      padding: 8px;
      margin-bottom: 5px;
      border-radius: 4px;
      text-align: center;

      &.selected {
        background-color: #007bff;
        color: white;
      }

      &:hover {
        background-color: #e0e0e0;
      }
    }
  }
}

/* 右栏：上角色，下数字 */
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px;
}

/* 数字网格 */
.number-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* 4列 = 1～16 */
  grid-gap: 8px;

  .number-cell {
    border: 1px solid #ccc;
    border-radius: 6px;
    text-align: center;
    padding: 10px 0;
    cursor: pointer;
    background-color: #f9f9f9;

    &.selected {
      background-color: #007bff;
      color: white;
      font-weight: bold;
    }
    &:hover {
      background-color: #ddd;
    }
  }
}
</style>
