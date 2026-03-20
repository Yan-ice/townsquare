<template>
    <div class="app-root">
      <TimerCircle />
      <TownSquare2 />
      <Menu ref="menu"></Menu>
      <EditionModal />
      <FabledModal />
      <RolesModal />
      <ReferenceModal />
      <NightOrderModal />
      <VoteHistoryModal />
      <MessageModal />
      <NoteModal />
      <PrivateChatModal />
      <GameStateModal />
      <PromptModal />
      <UserRoleSelectionModal />
      <OfflineShowInfoModal />
      <PauseModal />
      <Gradients />
    </div>
      
  </template>
  
  <script>
  /* eslint-disable */
  import { mapState } from "vuex";
  import { version } from "@/../package.json";
  import TownInfo from "@/components/TownInfo";
  import Menu from "@/components/Menu";
  import RolesModal from "@/components/modals/RolesModal";
  import EditionModal from "@/components/modals/EditionModal";
  import Intro from "@/components/Intro";
  import ReferenceModal from "@/components/modals/ReferenceModal";
  import Gradients from "@/components/Gradients";
  import NightOrderModal from "@/components/modals/NightOrderModal";
  import FabledModal from "@/components/modals/FabledModal";
  import PrivateChatModal from "@/components/modals/PrivateChatModal";
  import VoteHistoryModal from "@/components/modals/VoteHistoryModal";
  import GameStateModal from "@/components/modals/GameStateModal";
  import TownSquare2 from "@/components/TownSquare2"
  import MessageModal from "../components/modals/MessageModal";
  import PromptModal from "../components/modals/PromptModal";
  import NoteModal from "../components/modals/NoteModal";
  import TimerCircle from "@/components/TimerCircle.vue";
import OfflineShowInfoModal from "../components/modals/OfflineShowInfoModal.vue";
import PauseModal from "../components/modals/PauseModal.vue";
import UserRoleSelectionModal from "../components/modals/UserRoleSelectionModal.vue";

  export default {
    components: {
      TownSquare2,
      GameStateModal,
      PrivateChatModal,
      VoteHistoryModal,
      FabledModal,
      NightOrderModal,
      ReferenceModal,
      MessageModal,
      Intro,
      TownInfo,
      Menu,
      EditionModal,
      RolesModal,
      NoteModal,
      PromptModal,
      OfflineShowInfoModal,
      PauseModal,
      UserRoleSelectionModal,
      Gradients,
      TimerCircle,
    },
    computed: {
    ...mapState(["grimoire", "session"]),
    ...mapState("players", ["players"]),
    ...mapState("loginbackend",["playerId"]),
    ...mapState("loginbackend",["sessionId"]),
    },
    data() {
      return {
        version,
      };
    },
    methods: {
      keyup({ key, ctrlKey, metaKey }) {
        if (ctrlKey || metaKey) return;
        switch (key.toLocaleLowerCase()) {
          case "a":
            this.$refs.menu.addPlayer();
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
    mounted() {
      const update = () => {
        const vh = window.visualViewport
          ? window.visualViewport.height
          : window.innerHeight;
        document.documentElement.style.setProperty("--svh", `${vh}px`);
      };

      update();

      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", update);
        window.visualViewport.addEventListener("scroll", update);
      }
      window.addEventListener("resize", update);
    },
    beforeDestroy() {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", this.updateViewportUnits);
        window.visualViewport.removeEventListener("scroll", this.updateViewportUnits);
      }
      window.removeEventListener("resize", this.updateViewportUnits);
    },
  };
  </script>
  
  <style lang="scss">
  @import "@/vars";
  
  .app-root {
    width: 100%;
    height: var(--svh);   /* 真正的可视高度 */
    position: relative;   /* 为绝对定位子元素提供基准 */
    overflow: hidden;
  }

  @font-face {
    font-family: "Papyrus";
    src: url("@/assets/fonts/papyrus.eot"); /* IE9*/
    src:
      url("@/assets/fonts/papyrus.eot?#iefix") format("embedded-opentype"),
      /* IE6-IE8 */ url("@/assets/fonts/papyrus.woff2") format("woff2"),
      /* chrome firefox */ url("@/assets/fonts/papyrus.woff") format("woff"),
      /* chrome firefox */ url("@/assets/fonts/papyrus.ttf") format("truetype"),
      /* chrome firefox opera Safari, Android, iOS 4.2+*/
        url("@/assets/fonts/papyrus.svg#PapyrusW01") format("svg"); /* iOS 4.1- */
  }
  
  @font-face {
    font-family: PiratesBay;
    src: url("@/assets/fonts/piratesbay.ttf");
    font-display: swap;
  }
  
  html,
  body {
    font-size: 1.2em;
    line-height: 1.4;
    background: url("@/assets/background.jpg") center center;
    background-size: cover;
    color: white;
    height: auto;
    min-height: var(--svh);
    font-family: "Roboto Condensed", sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    padding: 0;
    margin: 0;
    overflow: hidden;
  }
  
  @import "@/media";
  
  * {
    box-sizing: border-box;
    position: relative;
  }
  
  a {
    color: $townsfolk;
    &:hover {
      color: $demon;
    }
  }
  
  h1,
  h2,
  h3,
  h4,
  h5 {
    margin: 0;
    text-align: center;
    font-family: PiratesBay, sans-serif;
    letter-spacing: 1px;
    font-weight: normal;
  }
  
  ul {
    list-style-type: none;
    margin: 0;
    padding: 0;
  }
 
  .blur-enter-active,
  .blur-leave-active {
    transition: all 250ms;
    filter: blur(0);
  }
  .blur-enter,
  .blur-leave-to {
    opacity: 0;
    filter: blur(20px);
  }
  
  // Buttons
  .button-group {
    display: flex;
    align-items: center;
    justify-content: center;
    align-content: center;
    .button {
      margin: 5px 0;
      border-radius: 0;
      &:first-child {
        border-top-left-radius: 15px;
        border-bottom-left-radius: 15px;
      }
      &:last-child {
        border-top-right-radius: 15px;
        border-bottom-right-radius: 15px;
      }
    }
  }
  .button {
    padding: 0;
    border: solid 0.125em transparent;
    border-radius: 15px;
    box-shadow:
      inset 0 1px 1px #9c9c9c,
      0 0 10px #000;
    background:
      radial-gradient(at 0 -15%, rgba(#fff, 0.07) 70%, rgba(#fff, 0) 71%) 0 0/ 80%
        90% no-repeat content-box,
      linear-gradient(#4e4e4e, #040404) content-box,
      linear-gradient(#292929, #010101) border-box;
    color: white;
    font-weight: bold;
    text-shadow: 1px 1px rgba(0, 0, 0, 0.5);
    line-height: 170%;
    margin: 5px auto;
    cursor: pointer;
    transition: all 200ms;
    white-space: nowrap;
    &:hover {
      color: red;
    }
    &.disabled {
      color: gray;
      cursor: default;
      opacity: 0.75;
    }
    &:before,
    &:after {
      content: " ";
      display: inline-block;
      width: 10px;
      height: 10px;
    }
    &.townsfolk {
      background:
        radial-gradient(
            at 0 -15%,
            rgba(255, 255, 255, 0.07) 70%,
            rgba(255, 255, 255, 0) 71%
          )
          0 0/80% 90% no-repeat content-box,
        linear-gradient(#0031ad, rgba(5, 0, 0, 0.22)) content-box,
        linear-gradient(#292929, #001142) border-box;
      box-shadow:
        inset 0 1px 1px #002c9c,
        0 0 10px #000;
      &:hover:not(.disabled) {
        color: #008cf7;
      }
    }
    &.demon {
      background:
        radial-gradient(
            at 0 -15%,
            rgba(255, 255, 255, 0.07) 70%,
            rgba(255, 255, 255, 0) 71%
          )
          0 0/80% 90% no-repeat content-box,
        linear-gradient(#ad0000, rgba(5, 0, 0, 0.22)) content-box,
        linear-gradient(#292929, #420000) border-box;
      box-shadow:
        inset 0 1px 1px #9c0000,
        0 0 10px #000;
    }
  }
  
  </style>
  