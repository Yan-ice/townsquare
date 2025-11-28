<template>
  <div
    id="app"
    @keyup="keyup"
    tabindex="-1"
    :class="{
      night: grimoire.isNight,
      static: grimoire.isStatic,
    }"
    :style="{
      backgroundImage: grimoire.background
        ? `url('${grimoire.background}')`
        : '',
    }"
  >
    <video
      id="background"
      v-if="grimoire.background && grimoire.background.match(/\.(mp4|webm)$/i)"
      :src="grimoire.background"
      autoplay
      loop
    ></video>
    <div class="backdrop"></div>

    <LoginWin v-if="!playerId" />
    <SelectRoomWin v-else-if="!sessionId" />
    <ShowInfo v-else-if="openInfo" />
    <MainWindow v-else />

    <!-- 修改后的 transition 只包含一个子元素 -->
    <transition name="blur">
      <component :is="currentComponent" v-if="currentComponent" />
    </transition>

    <span id="version">v{{ version }}</span>
  </div>
</template>

<script>
import { mapState } from "vuex";
import { version } from "../package.json";
import LoginWin from "@/views/Login";
import MainWindow from "@/views/Main";
import SelectRoomWin from "@/views/SelectRoom";
import TownInfo from "./components/TownInfo.vue";
import Vote from "@/components/Vote";
import TimerInfo from "@/components/TimerInfo";
import Intro from "./components/Intro.vue";
import loginbackend from "./store/loginbackend";
import ShowInfo from "./views/ShowInfo.vue";

export default {
  components: {
    LoginWin,
    SelectRoomWin,
    MainWindow,
    Vote,
    Intro,
    TownInfo,
    TimerInfo,
    ShowInfo,
  },
  computed: {
    ...mapState(["grimoire", "session"]),
    ...mapState("players", ["players"]),
    ...mapState("showinfo", ["openInfo"]),
    ...mapState("loginbackend", ["playerId", "sessionId"]),

    currentComponent() {
      if (this.sessionId && this.playerId) {
        if (!this.players.length) return "Intro";
        if (this.session.nomination) return "Vote";
        if (!this.session.isSpectator && this.session.openTimer) return "TimerInfo";
        if (this.session.isSpectator && this.session.totalTimer > 0) return "TimerInfo";
        return "TownInfo";
      }
      return null;
    },
  },
  data() {
    return {
      version,
    };
  },
  methods: {
    keyup({ key, ctrlKey, metaKey }) {

      //if (!ctrlKey || metaKey) return;

      if(!this.$store.state.loginbackend.sessionId) {
        console.log("no session");
        return;
      }

      const anyModalOpen = Object.values(this.$store.state.modals).some(Boolean);
      if (anyModalOpen) {
        console.log("has model open:" + Object.values(this.$store.state.modals));
        return;
      }

      switch (key.toLocaleLowerCase()) {
        case "r":
          this.$store.commit("toggleModal", "reference");
          break;
        case "n":
          this.$store.commit("toggleModal", "notes");
          break;
        case "e":
          if (this.session.isSpectator) return;
          this.$store.commit("toggleModal", "edition");
          break;
        case "v":
          if (this.session.voteHistory.length) {
            this.$store.commit("toggleModal", "voteHistory");
          }
          break;
        case "t":
          this.$store.commit("session/setOpenTimer", !this.session.openTimer);
          break;
      }
    },
    updateViewportUnits() {
      // 设置动态可视高度和宽度
      const vh = window.innerHeight * 0.01;
      const vw = window.innerWidth * 0.01;
      document.documentElement.style.setProperty('--svh', `${vh}px`);
      document.documentElement.style.setProperty('--svw', `${vw}px`);
    }
  },
  mounted() {
    // 初始化 SVH/SVW
    this.updateViewportUnits();
    // 监听 resize 动态更新
    window.addEventListener('resize', this.updateViewportUnits);
  },
  beforeDestroy() {
    // 移除监听
    window.removeEventListener('resize', this.updateViewportUnits);
  },
};
</script>

<style lang="scss">

#app {
    width: calc(var(--svw, 1vw) * 100);
    height: calc(var(--svh, 1vh) * 100);
    background-position: center center;
    background-size: cover;
    display: flex;
    align-items: center;
    align-content: center;
    justify-content: center;
  
    // disable all animations
    &.static *,
    &.static *:after,
    &.static *:before {
      transition: none !important;
      animation: none !important;
    }
  }
  
  #version {
    position: absolute;
    text-align: right;
    right: 10px;
    bottom: 10px;
    font-size: 60%;
    opacity: 0.5;
  }
  
  /* video background */
  video#background {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  /* Night phase backdrop */
  #app > .backdrop {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    top: 0;
    pointer-events: none;
    background: black;
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 1) 0%,
      rgba(1, 22, 46, 1) 50%,
      rgba(0, 39, 70, 1) 100%
    );
    opacity: 0;
    transition: opacity 1s ease-in-out;
    &:after {
      content: " ";
      display: block;
      width: 100%;
      padding-right: 2000px;
      height: 100%;
      background: url("@/assets/clouds.png") repeat;
      background-size: 2000px auto;
      animation: move-background 120s linear infinite;
      opacity: 0.3;
    }
  }
  
  @keyframes move-background {
    from {
      transform: translate3d(-2000px, 0px, 0px);
    }
    to {
      transform: translate3d(0px, 0px, 0px);
    }
  }
  
  #app.night > .backdrop {
    opacity: 0.5;
  }
</style>