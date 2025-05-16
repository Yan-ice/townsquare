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
    <transition name="blur">
      <Intro v-if="!players.length"></Intro>
      <TownInfo v-if="players.length && !session.nomination"></TownInfo>
      <Vote v-if="session.nomination"></Vote>
    </transition>

    <LoginWin v-if="!playerId" />
    <SelectRoomWin v-else-if="!sessionId" />
    <MainWindow v-else />
    <span id="version">v{{ version }}</span>
  </div>
</template>

<script setup>

</script>

<script>
/* eslint-disable */
import { mapState } from "vuex";
import { version } from "../package.json";
import LoginWin from "@/views/Login";
import MainWindow from "@/views/Main";
import SelectRoomWin from "@/views/SelectRoom";

export default {
  components: {
    LoginWin,
    SelectRoomWin,
    MainWindow,
    // VoteHistoryModal,
    // FabledModal,
    // NightOrderModal,
    // Vote,
    // ReferenceModal,
    // Intro,
    // TownInfo,
    // TownSquare,
    // Menu,
    // EditionModal,
    // RolesModal,
    // Gradients,
    // SoundDetector,
  },
  computed: {
    ...mapState(["grimoire", "session"]),
    ...mapState("players", ["players"]),
    ...mapState("loginbackend",["playerId"]),
    ...mapState("session",["sessionId"]),
  },
  data() {
    return {
      version,
    };
  },
  methods: {
    keyup({ key, ctrlKey, metaKey }) {
      return;
      if (!ctrlKey || metaKey) return;
      switch (key.toLocaleLowerCase()) {
        case "g":
          this.$store.commit("toggleGrimoire");
          break;
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
