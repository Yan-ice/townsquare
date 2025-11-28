<template>
  <li class="player-container">
    <div
      ref="player"
      class="playericon"
      :class="[
        {
          //you: loginbackend.sessionId && player.id && player.id === loginbackend.playerId,
          you: player.id && player.isTalkingFlag,
          darken: isApplier,
          dead: player.isDead
        },
        player.role.team,
      ]"
    >
      <!-- For the story teller on left top. -->
      <Token
          v-if="player.isST"
          :role="player.role"
          @set-role="acceptPlayer()"
      />
      <Token
          v-else
          :role="displayRole"
          @set-role="acceptPlayer()"
      />
    </div>
    <div
        ref="player"
        class="name"
        @click="acceptPlayer()"
      >
      <span>{{ player.name }}</span>
    </div>
  </li>
</template>

<script>
import Token from "./Token";
import { mapGetters, mapState } from "vuex";



export default {
  components: {
    Token,
  },
  props: {
    player: {
      type: Object,
      required: true,
    },
    roleth: Number, // <--- 新增这一行
  },
  computed: {
    ...mapState("players", ["players"]),
    ...mapState(["grimoire", "session", "loginbackend"]),
    ...mapGetters({ nightOrder: "players/nightOrder", playerToIndex: "players/playerToIndex" }),
    index: function () {
      return this.playerToIndex(this.player);
    },
    isDisplayMask() {
     return this.roleth === 2;
    },
    displayRole() {
      if (this.isDisplayMask) {
        return this.player.role2;
      }
      return this.player.role;
    },    // 申请者列表
    isApplier() {
      const v = this.$store.getters["chat/myRoomApplier"];
      if (v) {
        return v.includes(this.player.id);
      }
      return false;
    }
  },
  methods: {
    updatePlayer(property, value, closeMenu = false) {
      if (
        this.session.isSpectator &&
        property !== "reminders" && property !== "reminders2"
      )
        return;
      this.$store.commit("players/update", {
        player: this.player,
        property,
        value,
      });
      if (closeMenu) {
        this.isMenuOpen = false;
      }
    },
    acceptPlayer() {
      console.log("accept clicked");
      if(this.$store.getters["chat/isRoomHost"]) {
        console.log("is host");
        if(this.isApplier) {
          console.log("is applier");
          let command = {
            "header": "request",
            "receiver": "host",
            "command": "chat/processChatChannel",
            "param": {
              "ownerId": this.$store.getters["chat/myRoomId"],
              "applierId": this.player.id,
              "comment": true
            },
          }
          this.$store.commit("session/sendCommand", command);
        }else{
          //TODO: kick?
        }

      }
      
    }
  },
};
</script>

<style lang="scss">
@import "../vars.scss";

.darken { opacity: 0.6; }

.player-container {
  display: flex;
  flex-direction: column; /* 图标 + 名字垂直排列 */
  align-items: center;    /* 水平居中 */
  justify-content: flex-start;
  width: 100px;
  min-width: 80px;
  max-width: 150px;
  list-style: none;
  position: relative;

  .playericon {
    position: relative;
    display: flex;
    flex-direction: column; /* 垂直排列：life + subtoken + mask */
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 1;       /* 保持正方形 */
    z-index: 2;

    Token {
      position: absolute; /* 保留绝对定位 */
      top: 50%;           /* 居中 */
      left: 50%;
      transform: translate(-50%, -50%); /* 精准居中 */
      width: 100%;         /* 相对父容器大小 */
      height: 100%;
    }

    .life {
      border-radius: 50%;
      width: 60%;           
      aspect-ratio: 1;      
      background: url("../assets/life.png") center center no-repeat;
      background-size: cover;
      border: 3px solid black;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
      cursor: pointer;
      position: relative;

      &:before {
        content: " ";
        display: block;
        padding-top: 100%;
      }

      /* 死亡状态 */
      .playericon.dead & {
        background-image: url("../assets/death.png");
        &:after {
          content: " ";
          width: 100%;
          height: 100%;
          background: url("../assets/vote.png") center center no-repeat;
          background-size: 50%;
          pointer-events: none;
          display: block;
        }
      }

      /* Traveler 灰色 */
      .playericon.traveler & {
        filter: grayscale(100%);
      }
    }

    .token {
      width: 100%;
      transition: transform 200ms ease-in-out;
      backface-visibility: hidden;
    }

    /* 夜光效果 */
    &.you.townsfolk .token { animation: townsfolk-glow 2s ease-in-out infinite; }
    &.you.outsider .token { animation: outsider-glow 2s ease-in-out infinite; }
    &.you.demon .token { animation: demon-glow 2s ease-in-out infinite; }
    &.you.minion .token { animation: minion-glow 2s ease-in-out infinite; }
    &.you.traveler .token { animation: traveler-glow 2s ease-in-out infinite; }
  }

  /* 名字在 playericon 下方 */
  .name {
    margin-top: 0.2em;
    text-align: center;
    font-size: 0.9em;
    // background: rgba(0,0,0,0.4);
    // border: 2px solid black;
    // border-radius: 4px;
    // padding: 0 4px;
    // box-shadow: 0 0 5px black;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }
}

</style>
