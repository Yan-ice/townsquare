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
import Intro from "./components/Intro.vue";

export default {
  components: {
    LoginWin,
    SelectRoomWin,
    MainWindow,
    Vote,
    Intro,
    TownInfo,
  },
  computed: {
    ...mapState(["grimoire", "session"]),
    ...mapState("players", ["players"]),
    ...mapState("loginbackend", ["playerId", "sessionId"]),

    currentComponent() {
      if (this.sessionId && this.playerId) {
        if (!this.players.length) return "Intro";
        if (!this.session.nomination) return "TownInfo";
        return "Vote";
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
      if (!ctrlKey || metaKey) return;
      switch (key.toLocaleLowerCase()) {
        case "a":
          this.$refs.menu.addPlayer();
          break;
        case "h":
          this.$refs.menu.hostSession();
          break;
        case "j":
          this.$refs.menu.joinSession();
          break;
        case "r":
          this.$store.commit("toggleModal", "reference");
          break;
        case "n":
          this.$store.commit("toggleModal", "nightOrder");
          break;
        case "e":
          if (this.session.isSpectator) return;
          this.$store.commit("toggleModal", "edition");
          break;
        case "c":
          if (this.session.isSpectator) return;
          this.$store.commit("toggleModal", "roles");
          break;
        case "v":
          if (this.session.voteHistory.length || !this.session.isSpectator) {
            this.$store.commit("toggleModal", "voteHistory");
          }
          break;
        case "s":
          if (this.session.isSpectator) return;
          this.$refs.menu.toggleNight();
          break;
        case "escape":
          this.$store.commit("toggleModal");
      }
    },
  },
};
</script>
