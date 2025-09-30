<template>
  <div class="overlay">

    <div class="content">
      <h1 class="title">{{ keynote }}</h1>

      <h1 v-if="numbers.length > 0" class="title">{{ numbers.join(" ") }}</h1>
      <h1 v-if="yesOrNo != 0" class="title">{{ yesOrNo > 0 ? "是" : "否"}}</h1>

      <ul v-if="characters.length > 0" class="tokens">
        <li
              v-for="role in characters"
              :key="role.id"
        >
            <span
              class="icon"
              v-if="role.id"
              :style="{
                backgroundImage: `url(${
                  role.image && grimoire.isImageOptIn
                    ? role.image
                    : require('../assets/icons/' + (role.imageAlt || role.id) + '.png')
                })`,
              }"
            ></span>
            <svg viewBox="0 0 150 150" class="name">
              <path
                d="M 13 75 C 13 160, 138 160, 138 75"
                id="curve"
                fill="transparent"
              />
              <text
                width="150"
                x="66.6%"
                text-anchor="middle"
                class="label mozilla"
                :font-size="role.name | nameToFontSize"
              >
                <textPath xlink:href="#curve">
                  {{ role.name }}
                </textPath>
              </text>
            </svg>
        </li>
      </ul>
    </div>

    <button class="back-button" @click="onClose">返回</button>

  </div>
</template>

<script>
import { mapMutations, mapState } from "vuex";

export default {
  computed: {
    ...mapState(["roles", "modals", "grimoire"]),
    ...mapState("players", ["players"]),
    ...mapState("showinfo", ["keynote", "numbers", "characters", "yesOrNo"])
  },
  filters: {
    nameToFontSize: (name) => (name && name.length > 10 ? "90%" : "110%"),
  },
  methods: {
    onClose() {
      this.$store.commit('showinfo/setOpenInfo', false);
    }
  }
};
</script>

<style scoped lang="scss">
@import "../vars.scss";

.back-button {
  position: fixed;
  top: 20px;
  left: 20px;
  border: 2px solid white;
  border-radius: 6px;
  padding: 6px 12px;
  background: transparent;
  color: white;
  font-size: 24px;
  cursor: pointer;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.8); /* 半透明黑色背景 */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999; /* 确保覆盖最上层 */
}

.content {
  text-align: center;
  color: white;
}

.title {
  font-size: 5rem;
  margin-bottom: 1rem;
}

.numbers {
  font-size: 1.5rem;
  letter-spacing: 0.2rem; /* 增加空隙更易读 */
}


ul.tokens {
  padding-left: 5%;
  width: 100vw;
  padding: 0;
  margin: 0;
  display: flex;        /* 横向排列 */
  justify-content: center;
  flex-wrap: wrap;      /* 超出时换行 */
  gap: 10px;            /* li 之间的间距 */
  li {
    border-radius: 50%;
    background: url("../assets/token.png") center center;
    background-size: 100%;
    width: 18vw;
    height: 18vw;
    margin: 3px;
    transition: all 250ms;
    .fa-exclamation-triangle {
      position: absolute;
      color: red;
      filter: drop-shadow(0 0 3px black) drop-shadow(0 0 3px black);
      top: 5px;
      right: -5px;
      font-size: 150%;
      display: none;
    }

  .icon {
    background-size: 100%;
    background-repeat: no-repeat;
    background-position: center 30%;
    position: absolute;
    width: 100%;
    height: 100%;
    margin-top: 3%;
  }

  span {
    position: absolute;
    width: 100%;
    height: 100%;
    background-size: 100%;
    pointer-events: none;
  }

  .name {
    width: 100%;
    height: 100%;
    font-size: 24px; // svg fonts are relative to document font size
    .label {
      fill: black;
      stroke: white;
      stroke-width: 2px;
      paint-order: stroke;
      font-family: "Papyrus", serif;
      font-weight: bold;
      text-shadow: 0 2px 2px rgba(0, 0, 0, 0.2);
      letter-spacing: 1px;

      @-moz-document url-prefix() {
        &.mozilla {
          stroke: none;
          text-shadow: none;
          filter: drop-shadow(0 1.5px 0 white) drop-shadow(0 -1.5px 0 white)
            drop-shadow(1.5px 0 0 white) drop-shadow(-1.5px 0 0 white)
            drop-shadow(0 2px 2px rgba(0, 0, 0, 0.5));
        }
      }
    }
  }
  }
  
}

</style>
