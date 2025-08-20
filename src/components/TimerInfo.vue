<template>
  <ul class="info">
    <li>{{ session.timerPhase }}</li>
    <li v-if="session.isSpectator" style="font-size: 40px; ">
      {{ padZero(session.totalTimer / 60000) }}:{{ padZero((session.totalTimer % 60000) / 1000) }}
    </li>
    <span v-if="!session.isSpectator">
        <div class="button-group mark">
            <div class="button" @click="setTimerPhase('私聊阶段')">私聊阶段</div>
            <div class="button" @click="setTimerPhase('公聊阶段')">公聊阶段</div>
        </div>
        计时器:
          <font-awesome-icon
            @mousedown.prevent="setCountdown(-30000)"
            icon="minus-circle"
          />
          {{ padZero(presetTotalMs / 60000) }}m {{ padZero((presetTotalMs % 60000) / 1000) }}s
          <font-awesome-icon
            @mousedown.prevent="setCountdown(30000)"
            icon="plus-circle"
          />
          <div class="button-group mark">
            <div class="button" @click="startCountdownButton">开始</div>
            <div class="button" @click="stopCountdownButton">停止</div>
          </div>
      </span>
  </ul>
</template>

<script>
import gameJSON from "./../game";
import { mapState } from "vuex";

export default {
  data() {
    return {
      presetTotalMs: 300 * 1000,
    };
  },
  computed: {
    ...mapState(["edition", "grimoire", "session"]),
    ...mapState("players", ["players"]),
  },
  methods: {
    padZero(n) {
      n = Math.floor(n);
      return n < 10 ? "0" + n : n;
    },
    setCountdown(diff) {
      if(this.presetTotalMs + diff > 0) {
        this.presetTotalMs += diff;
      }
    },
    startCountdownButton() {
      this.$store.commit("session/setTotalTimer", this.presetTotalMs);
      this.$store.commit("session/setOpenTimer", false);
    },
    stopCountdownButton() {
      this.$store.commit("session/setTotalTimer", 0);
      this.$store.commit("session/setOpenTimer", false);
    },
    setTimerPhase(phase) {
      this.$store.commit("session/setTimerPhase", phase);
    },
  }
};
</script>

<style lang="scss" scoped>
@import "../vars.scss";

.info {
  position: absolute;
  display: flex;
  width: 20%;
  height: 20%;
  padding: 0 0;
  align-items: center;
  align-content: center;
  justify-content: center;
  flex-wrap: wrap;
  background: url("../assets/demon-head.png") center center no-repeat;
  background-size: auto 100%;
  z-index: 19; // 置于倒计时扇形之上

  li {
    font-weight: bold;
    width: 100%;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.7));
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    text-shadow: 0 2px 1px black, 0 -2px 1px black, 2px 0 1px black, -2px 0 1px black;
    span { white-space: nowrap; }

    .meta {
      text-align: center;
      flex-basis: 100%;
      font-family: PiratesBay, sans-serif;
      font-weight: normal;
    }
    svg { margin-right: 10px; }
    .players { color: #00f700; }
    .alive { color: #ff4a50; }
    .votes { color: #fff; }
    .townsfolk { color: $townsfolk; }
    .outsider { color: $outsider; }
    .minion { color: $minion; }
    .demon { color: $demon; }
    .traveler { color: $traveler; }
  }

  li.edition {
    width: 220px;
    height: 200px;
    max-width: 100%;
    max-height: 100%;
    background-position: 0 center;
    background-repeat: no-repeat;
    background-size: 100% auto;
    position: absolute;
    top: -25%;
  }
}
</style>
