<template>
  <div id="controls">
    <span
      class="nomlog-summary"
      v-show="session.voteHistory.length && loginbackend.sessionId"
      @click="toggleModal('voteHistory')"
      :title="`${session.voteHistory.length} recent ${
        session.voteHistory.length == 1 ? 'nomination' : 'nominations'
      }`"
    >
      <font-awesome-icon icon="book-dead" />
      {{ session.voteHistory.length }}
    </span>
    <span
      class="session"
      :class="{
        spectator: session.isSpectator,
        reconnecting: session.isReconnecting,
      }"
      v-if="loginbackend.sessionId"
      @click="leaveSession"
      :title="`${session.playerCount} other players in this session${
        session.ping ? ' (' + session.ping + 'ms latency)' : ''
      }`"
    >
      <font-awesome-icon icon="broadcast-tower" />
      {{ session.playerCount }}
    </span>
    <div class="menu" :class="{ open: grimoire.isMenuOpen }">
      <font-awesome-icon icon="cog" @click="toggleMenu" />
      <ul>
        <li class="tabs" :class="tab">
          <font-awesome-icon icon="book-open" @click="tab = 'grimoire'" />
          <font-awesome-icon icon="broadcast-tower" @click="tab = 'session'" />
          <font-awesome-icon
            icon="users"
            v-if="!session.isSpectator"
            @click="tab = 'players'"
          />
          <font-awesome-icon icon="theater-masks" @click="tab = 'characters'" />
          <font-awesome-icon icon="question" @click="tab = 'help'" />
        </li>

        <template v-if="tab === 'grimoire'">
          <!-- Grimoire -->
          <li class="headline">魔典选项</li>
          <li @click="toggleGrimoire" v-if="players.length">
            <template v-if="!grimoire.isPublic">隐藏魔典</template>
            <template v-if="grimoire.isPublic">显示魔典</template>
            <em>[G]</em>
          </li>
          <li @click="toggleNight" v-if="!session.isSpectator">
            <template v-if="!grimoire.isNight">切换到夜晚</template>
            <template v-if="grimoire.isNight">切换到白天</template>
            <em>[S]</em>
          </li>
          <li @click="toggleModal('reference')">
            角色能力表
            <em>[R]</em>
          </li>
          <li @click="toggleModal('nightOrder')">
            夜晚顺序表
            <em>[N]</em>
          </li>
          <li @click="toggleNightOrder" v-if="players.length">
            显示夜晚顺序
            <em>
              <font-awesome-icon
                :icon="[
                  'fas',
                  grimoire.isNightOrder ? 'check-square' : 'square',
                ]"
              />
            </em>
          </li>
          <li v-if="players.length">
            大小缩放
            <em>
              <font-awesome-icon
                @click="setZoom(grimoire.zoom - 1)"
                icon="search-minus"
              />
              {{ Math.round(100 + grimoire.zoom * 10) }}%
              <font-awesome-icon
                @click="setZoom(grimoire.zoom + 1)"
                icon="search-plus"
              />
            </em>
          </li>
          <li @click="setBackground">
            背景图片
            <em><font-awesome-icon icon="image" /></em>
          </li>
          <!-- <li v-if="!edition.isOfficial" @click="imageOptIn">
            <small>Show Custom Images</small>
            <em
              ><font-awesome-icon
                :icon="[
                  'fas',
                  grimoire.isImageOptIn ? 'check-square' : 'square',
                ]"
            /></em>
          </li> -->
          <!-- <li @click="toggleStatic">
            Disable Animations
            <em
              ><font-awesome-icon
                :icon="['fas', grimoire.isStatic ? 'check-square' : 'square']"
            /></em>
          </li> -->
          <!-- <li @click="toggleMuted">
            Mute Sounds
            <em
              ><font-awesome-icon
                :icon="['fas', grimoire.isMuted ? 'volume-mute' : 'volume-up']"
            /></em>
          </li> -->
        </template>

        <template v-if="tab === 'session'">
          <!-- Session -->
          <li class="headline" v-if="loginbackend.sessionId">
            {{ session.isSpectator ? "游戏中" : "说书中" }}
          </li>
          <li class="headline" v-else>线上游戏</li>
          <template v-if="!loginbackend.sessionId">
            <li @click="hostSession">主持游戏(废弃)<em>[H]</em></li>
            <li @click="joinSession">加入游戏(废弃)<em>[J]</em></li>
          </template>
          <template v-else>
            <!-- <li v-if="session.ping">
              Delay to {{ session.isSpectator ? "host" : "players" }}
              <em>{{ session.ping }}ms</em>
            </li> -->
            <li v-if="!session.isSpectator" @click="distributeRoles">
              派发角色
              <em><font-awesome-icon icon="theater-masks" /></em>
            </li>
            <li
              v-if="session.isSpectator"
              @click="tellST()"
            >
              私聊说书人<em>[T]</em>
            </li>
            <li
              @click="toggleModal('message')"
            >
              聊天记录<em>[C]</em>
            </li>

            <li
              v-if="session.voteHistory.length || !session.isSpectator"
              @click="toggleModal('voteHistory')"
            >
              投票记录<em>[V]</em>
            </li>
            <li @click="leaveSession">
              离开房间
              <em>{{ loginbackend.sessionId }}</em>
            </li>
          </template>
        </template>

        <template v-if="tab === 'players' && !session.isSpectator">
          <!-- Users -->
          <li class="headline">玩家选项</li>
          <li @click="addPlayer" v-if="players.length < 20">添加座位<em>[A]</em></li>
          <!-- <li @click="randomizeSeatings" v-if="players.length > 2">
            Randomize
            <em><font-awesome-icon icon="dice" /></em>
          </li> -->
          <!-- <li @click="clearPlayers" v-if="players.length">
            Remove all
            <em><font-awesome-icon icon="trash-alt" /></em>
          </li> -->
        </template>

        <template v-if="tab === 'characters'">
          <!-- Characters -->
          <li class="headline">角色选项</li>
          <li v-if="!session.isSpectator" @click="toggleModal('edition')">
            选择剧本
            <em>[E]</em>
          </li>
          <li
            @click="toggleModal('roles')"
            v-if="!session.isSpectator && players.length > 4"
          >
            分配角色
            <em>[C]</em>
          </li>
          <!-- <li v-if="!session.isSpectator" @click="toggleModal('fabled')">
            Add Fabled
            <em><font-awesome-icon icon="dragon" /></em>
          </li> -->
          <li @click="clearRoles" v-if="players.length">
            清空角色
            <em><font-awesome-icon icon="trash-alt" /></em>
          </li>
        </template>

        <template v-if="tab === 'help'">
          <!-- Help -->
          <li class="headline">帮助</li>
          
          <li @click="toggleModal('gameState')">
            JSON
            <em><font-awesome-icon icon="file-code" /></em>
          </li>
          <li>
            <a href="https://github.com/yan-ice/townsquare" target="_blank">
              源码
            </a>
            <em>
              <a href="https://github.com/yan-ice/townsquare" target="_blank">
                <font-awesome-icon :icon="['fab', 'github']" />
              </a>
            </em>
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>

<script>
import { mapMutations, mapState } from "vuex";

export default {
  computed: {
    ...mapState(["grimoire", "session","loginbackend", "edition"]),
    ...mapState("players", ["players"]),
    ...mapState("loginbackend",["sessionId"]),
  },
  data() {
    return {
      tab: "grimoire",
    };
  },
  methods: {
    setBackground() {
      const background = prompt("Enter custom background URL");
      if (background || background === "") {
        this.$store.commit("setBackground", background);
      }
    },
    tellST() {
      const messag = prompt("输入给说书人发的私信消息：");
      if (messag) {
        this.$store.commit("loginbackend/tellMes", {receiver: '说书人', message: messag});
      }
    },
    hostSession() {
      if (this.loginbackend.sessionId) return;
      const sessionId = prompt(
        "Enter a channel number / name for your session",
        Math.round(Math.random() * 10000),
      );
      if (sessionId) {
        // removed.
        this.$store.commit("session/clearVoteHistory");
        this.$store.commit("session/setSpectator", false);
        //this.$store.commit("loginbackend/setSessionId", sessionId);
        //this.copySessionUrl();
      }
    },
    copySessionUrl() {
      const url = window.location.href.split("#")[0];
      const link = url + "#" + this.loginbackend.sessionId;
      navigator.clipboard.writeText(link);
    },
    distributeRoles() {
      if (this.session.isSpectator) return;
      const popup =
        "你确认要给所有入座玩家派发角色吗？";
      if (confirm(popup)) {
        this.$store.commit("session/distributeRoles", true);
        setTimeout(
          (() => {
            this.$store.commit("session/distributeRoles", false);
          }).bind(this),
          2000,
        );
      }
    },
    imageOptIn() {
      const popup =
        "Are you sure you want to allow custom images? A malicious script file author might track your IP address this way.";
      if (this.grimoire.isImageOptIn || confirm(popup)) {
        this.toggleImageOptIn();
      }
    },
    joinSession() {
      if (this.loginbackend.sessionId) return this.leaveSession();
      let sessionId = prompt(
        "Enter the channel number / name of the session you want to join",
      );
      if (sessionId.match(/^https?:\/\//i)) {
        sessionId = sessionId.split("#").pop();
      }
      if (sessionId) {
        // removed
        this.$store.commit("session/clearVoteHistory");
        this.$store.commit("session/setSpectator", true);
        this.$store.commit("toggleGrimoire", true);
        this.$store.commit("loginbackend/setSessionId", sessionId);

      }
    },
    leaveSession() {
      if (confirm("Are you sure you want to leave the active live game?")) {
        this.$store.commit("session/setSpectator", false);
        this.$store.dispatch("loginbackend/leaveSession");
      }
    },
    addPlayer() {
      if (this.session.isSpectator) return;
      if (this.players.length >= 20) return;
      this.$store.commit("players/add", "---");
    },
    randomizeSeatings() {
      if (this.session.isSpectator) return;
      if (confirm("Are you sure you want to randomize seatings?")) {
        this.$store.dispatch("players/randomize");
      }
    },
    clearPlayers() {
      if (this.session.isSpectator) return;
      if (confirm("Are you sure you want to remove all players?")) {
        // abort vote if in progress
        if (this.session.nomination) {
          this.$store.commit("session/nomination");
        }
        this.$store.commit("players/clear");
      }
    },
    clearRoles() {
      if (confirm("Are you sure you want to remove all player roles?")) {
        this.$store.dispatch("players/clearRoles");
      }
    },
    toggleNight() {
      this.$store.commit("toggleNight");
      if (this.grimoire.isNight) {
        this.$store.commit("session/setMarkedPlayer", -1);
      }
    },
    ...mapMutations([
      "toggleGrimoire",
      "toggleMenu",
      "toggleImageOptIn",
      "toggleMuted",
      "toggleNightOrder",
      "toggleStatic",
      "setZoom",
      "toggleModal",
    ]),
  },
};
</script>

<style scoped lang="scss">
@import "../vars.scss";

// success animation
@keyframes greenToWhite {
  from {
    color: green;
  }
  to {
    color: white;
  }
}

// Controls
#controls {
  position: absolute;
  right: 3px;
  top: 3px;
  text-align: right;
  padding-right: 50px;
  z-index: 75;

  svg {
    filter: drop-shadow(0 0 5px rgba(0, 0, 0, 1));
    &.success {
      animation: greenToWhite 1s normal forwards;
      animation-iteration-count: 1;
    }
  }

  > span {
    display: inline-block;
    cursor: pointer;
    z-index: 5;
    margin-top: 7px;
    margin-left: 10px;
  }

  span.nomlog-summary {
    color: $townsfolk;
  }

  span.session {
    color: $demon;
    &.spectator {
      color: $townsfolk;
    }
    &.reconnecting {
      animation: blink 1s infinite;
    }
  }
}

@keyframes blink {
  50% {
    opacity: 0.5;
    color: gray;
  }
}

.menu {
  width: 220px;
  transform-origin: 200px 22px;
  transition: transform 500ms cubic-bezier(0.68, -0.55, 0.27, 1.55);
  transform: rotate(-90deg);
  position: absolute;
  right: 0;
  top: 0;

  &.open {
    transform: rotate(0deg);
  }

  > svg {
    cursor: pointer;
    background: rgba(0, 0, 0, 0.5);
    border: 3px solid black;
    width: 40px;
    height: 50px;
    margin-bottom: -8px;
    border-bottom: 0;
    border-radius: 10px 10px 0 0;
    padding: 5px 5px 15px;
  }

  a {
    color: white;
    text-decoration: none;
    &:hover {
      color: red;
    }
  }

  ul {
    display: flex;
    list-style-type: none;
    padding: 0;
    margin: 0;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 0 10px black;
    border: 3px solid black;
    border-radius: 10px 0 10px 10px;

    li {
      padding: 2px 5px;
      color: white;
      text-align: left;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 30px;

      &.tabs {
        display: flex;
        padding: 0;
        svg {
          flex-grow: 1;
          flex-shrink: 0;
          height: 35px;
          border-bottom: 3px solid black;
          border-right: 3px solid black;
          padding: 5px 0;
          cursor: pointer;
          transition: color 250ms;
          &:hover {
            color: red;
          }
          &:last-child {
            border-right: 0;
          }
        }
        &.grimoire .fa-book-open,
        &.players .fa-users,
        &.characters .fa-theater-masks,
        &.session .fa-broadcast-tower,
        &.help .fa-question {
          background: linear-gradient(
            to bottom,
            $townsfolk 0%,
            rgba(0, 0, 0, 0.5) 100%
          );
        }
      }

      &:not(.headline):not(.tabs):hover {
        cursor: pointer;
        color: red;
      }

      em {
        flex-grow: 0;
        font-style: normal;
        margin-left: 10px;
        font-size: 80%;
      }
    }

    .headline {
      font-family: PiratesBay, sans-serif;
      letter-spacing: 1px;
      padding: 0 10px;
      text-align: center;
      justify-content: center;
      background: linear-gradient(
        to right,
        $townsfolk 0%,
        rgba(0, 0, 0, 0.5) 20%,
        rgba(0, 0, 0, 0.5) 80%,
        $demon 100%
      );
    }
  }
}
</style>
