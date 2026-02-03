<template>
  <ul class="info">
    <!-- 95vmin 圆扇形倒计时（居中，置底，不挡交互） -->
    <!-- <transition name="pie-fade">
      <div
        v-show="showPie"
        class="countdown-pie"
        :style="{
          '--pct': remainingPct,
          '--pie-fg': pieColor,
          '--pie-bg': pieBg,
        }"
        aria-hidden="true"
      ></div>
    </transition> -->

    <li
      class="edition"
      :class="['edition-' + edition.id]"
      :style="{
        backgroundImage: `url(${
          edition.logo
            ? edition.logo
            : require('../assets/editions/' + edition.id + '.png')
        })`,
      }"
    ></li>
    <li></li>
    <li>
      <span class="meta">
        {{ edition.name }} {{ edition.author ? "by " + edition.author : "" }}
      </span>
      <span>
        {{ players.length }} <font-awesome-icon class="players" icon="users" />
      </span>
      <span>
        {{ teams.alive }} <font-awesome-icon class="alive" icon="heartbeat" />
      </span>
      <span>
        {{ teams.votes }} <font-awesome-icon class="votes" icon="vote-yea" />
      </span>
    </li>

    <li v-if="players.length - teams.traveler < 5">请添加更多玩家！</li>
    <li v-if="players.length - teams.traveler >= 5">
      <span>
        {{ teams.townsfolk }}
        <font-awesome-icon class="townsfolk" icon="user-friends" />
      </span>
      <span>
        {{ teams.outsider }}
        <font-awesome-icon
          class="outsider"
          :icon="teams.outsider > 1 ? 'user-friends' : 'user'"
        />
      </span>
      <span>
        {{ teams.minion }}
        <font-awesome-icon
          class="minion"
          :icon="teams.minion > 1 ? 'user-friends' : 'user'"
        />
      </span>
      <span>
        {{ teams.demon }}
        <font-awesome-icon
          class="demon"
          :icon="teams.demon > 1 ? 'user-friends' : 'user'"
        />
      </span>
      <span v-if="teams.traveler">
        {{ teams.traveler }}
        <font-awesome-icon
          class="traveler"
          :icon="teams.traveler > 1 ? 'user-friends' : 'user'"
        />
      </span>
      <span v-if="grimoire.isNight">
        夜晚阶段 <font-awesome-icon :icon="['fas', 'cloud-moon']" />
      </span>
      <span v-if="!session.isSpectator && session.totalTimer > 0">
        计时器: {{ padZero(session.totalTimer / 60000) }}:{{ padZero((session.totalTimer % 60000) / 1000) }}
      </span>
    </li>
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
    teams() {
      const { players } = this.$store.state.players;
      const nonTravelers = this.$store.getters["players/nonTravelers"];
      const alive = players.filter((p) => p.isDead !== true).length;
      return {
        ...gameJSON[nonTravelers - 5],
        traveler: players.length - nonTravelers,
        alive,
        votes:
          alive +
          players.filter(
            (p) => p.isDead === true && p.isVoteless !== true
          ).length,
      };
    },
    ...mapState(["edition", "grimoire", "session"]),
    ...mapState("players", ["players"]),
  },
  methods: {
    padZero(n) {
      n = Math.floor(n);
      return n < 10 ? "0" + n : n;
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
  padding: 50px 0 0;
  align-items: center;
  align-content: center;
  justify-content: center;
  flex-wrap: wrap;
  background: url("../assets/demon-head.png") center center no-repeat;
  background-size: auto 100%;
  z-index: 1; // 置于倒计时扇形之上

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
