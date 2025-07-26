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
import loginbackend from "./store/loginbackend";

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
      }
    },
  },
};
</script>
