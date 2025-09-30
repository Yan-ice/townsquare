<template>
  <Modal
    v-if="modals.showInfo"
    @close="toggleModal('showInfo')"
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
        <div class="scroll-wrapper">
          <ul class="tokens">
            <li
              v-for="role in allRoles"
              :key="role.id"
              :class="[role.team, role.selected ? 'selected' : '']"
              @click="role.selected = role.selected ? 0 : 1"
            >
            <Token :role="role" />
            </li>
          </ul>

          </div>


        <!-- 下：数字多选 -->
        <div class="number-grid">
          <div
            v-for="n in 15"
            :key="n"
            :class="['number-cell', selectedNumbers.includes(n) ? 'selected' : '']"
            @click="toggleNumber(n)"
          >
            {{ n }}
          </div>

          <div
            :class="['number-cell', selectedYN>0 ? 'selected' : '']"
            @click="toggleYN(1)">
            是
          </div>
          <div
            :class="['number-cell', selectedYN<0 ? 'selected' : '']"
            @click="toggleYN(-1)">
            否
          </div>
        </div>
        
      </div>
    </div>

    <!-- 确认按钮 -->
    <div class="button-group">
      <div class="button" @click="confirmSelection">
        <font-awesome-icon icon="people-arrows" />
        确认展示
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
      keywords: ["这些角色不在场", " 他是恶魔 ", "他(们)是爪牙", "  你得知  ", "请选择玩家", "请选择角色", "这个选择不被允许", "要使用能力吗", "邪恶的", "善良的"], // 左侧关键词
      selectedKeyword: null,
      selectedNumbers: [],
      selectedYN: 0,
    };
  },
  computed: {
    ...mapState(["roles", "modals", "grimoire"]),
    ...mapState("players", ["players"]),
    ...mapGetters({ nonTravelers: "players/nonTravelers" }),
    allRoles() {
      // roleSelection 是对象，值是数组
      return Object.values(this.roleSelection).flat();
    },
  },
  methods: {
    selectRandomRoles() {
      this.roleSelection = {};
      this.roles.forEach((role) => {
        if (!this.roleSelection[role.team]) {
          this.$set(this.roleSelection, role.team, []);
        }
        this.roleSelection[role.team].push(role);
        this.$set(role, "selected", 0);
      });
      delete this.roleSelection["traveler"];
    },
    toggleNumber(n) {
      if (this.selectedNumbers.includes(n)) {
        this.selectedNumbers = this.selectedNumbers.filter((x) => x !== n);
      } else {
        this.selectedNumbers.push(n);
      }
    },
    toggleYN(n) {
      if (n*this.selectedYN > 0) {
        this.selectedYN = 0;
      } else {
        this.selectedYN = n;
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


      this.$store.commit("showinfo/setKeynote", this.selectedKeyword);
      this.$store.commit("showinfo/setNumbers", this.selectedNumbers);
      this.$store.commit("showinfo/setCharacters", roles);
      this.$store.commit("showinfo/setYesOrNo", this.selectedYN);
      console.log(roles);
      this.$store.commit("showinfo/setOpenInfo", true);
    },
    ...mapMutations(["toggleModal"]),
  },

  // load character list
  mounted: function () {
    if (!Object.keys(this.roleSelection).length) {
      this.selectRandomRoles();
    }
  },
  watch: {
    roles() {
      this.selectRandomRoles();
    },
  },
};
</script>

<style lang="scss" scoped>
@import "../../vars.scss";

.selector-wrapper {
  display: flex;
  max-height: 70vh;
}

/* 左栏：单选关键词 */
.left-panel {
  flex: 0 0 18vw;
  border-right: 1px solid #ccc;
  padding: 10px;

  ul {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      display: block; /* ✅ 每个 li 独占一行 */
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
  grid-template-columns: repeat(9, 1fr); /* 4列 = 1～16 */
  grid-gap: 12px;

  .number-cell {
    border: 1px solid #cccccc00;
    border-radius: 6px;
    text-align: center;
    font-size: 48;
    padding: 8px 0;
    cursor: pointer;

    &.selected {
      border: 1px solid #ccc;
      color: red;
      font-weight: bold;
    }
    &:hover {
      border: 1px solid #ccc;
    }
  }
}

.scroll-wrapper {
  min-height: 30vh;
  min-width: 40vw;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px; /* 避免滚动条遮住内容 */
  border: 1px solid #ccc; /* 可选：美观边框 */
  border-radius: 6px;
}
.scroll-wrapper::-webkit-scrollbar {
  width: 6px;
}
.scroll-wrapper::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
}

ul.tokens {
  padding-left: 5%;
  li {
    border-radius: 50%;
    width: 8vw;
    margin: 3px;
    opacity: 0.5;
    transition: all 250ms;
    &.selected {
      opacity: 1;
      .buttons {
        display: flex;
      }
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
      transform: scale(1.2);
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
    .buttons {
      display: none;
      position: absolute;
      top: 95%;
      text-align: center;
      width: 100%;
      z-index: 30;
      font-weight: bold;
      filter: drop-shadow(0 0 5px rgba(0, 0, 0, 1));
      span {
        flex-grow: 1;
      }
      svg {
        opacity: 0.25;
        cursor: pointer;
        &:hover {
          opacity: 1;
          color: red;
        }
      }
    }
  }
  .count {
    opacity: 1;
    position: absolute;
    left: 0;
    font-weight: bold;
    font-size: 75%;
    width: 5%;
    display: flex;
    align-items: center;
    justify-content: center;
    &:after {
      content: " ";
      display: block;
      padding-top: 100%;
    }
    &.townsfolk {
      color: $townsfolk;
    }
    &.outsider {
      color: $outsider;
    }
    &.minion {
      color: $minion;
    }
    &.demon {
      color: $demon;
    }
  }
}

.roles .modal {
  .multiple {
    display: block;
    text-align: center;
    cursor: pointer;
    &.checked,
    &:hover {
      color: red;
    }
    &.checked {
      margin-top: 10px;
    }
    svg {
      margin-right: 5px;
    }
    input {
      display: none;
    }
  }

  .warning {
    color: red;
    position: absolute;
    bottom: 20px;
    right: 20px;
    z-index: 10;
    svg {
      font-size: 150%;
      vertical-align: middle;
    }
    span {
      display: none;
      text-align: center;
      position: absolute;
      right: -20px;
      bottom: 30px;
      width: 420px;
      background: rgba(0, 0, 0, 0.75);
      padding: 5px;
      border-radius: 10px;
      border: 2px solid black;
    }
    &:hover span {
      display: block;
    }
  }
}
</style>

