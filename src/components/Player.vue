<template>
  <li :style="zoom">

    <div
      ref="player"
      class="player"
      :class="[
        {
          //you: loginbackend.sessionId && player.id && player.id === loginbackend.playerId,
          you: player.id && player.isTalkingFlag,
          
          dead: player.isDead,
          marked: session.markedPlayer === index,
          //huge: (index() % 3 == 1),
          'no-vote': player.isVoteless,
          'vote-yes': session.votes[index],
          'vote-lock': voteLocked,
        },
        player.role.team,
      ]"
    >
      
      <div class="shroud" @click="toggleStatus()"></div>
      <div class="life" @click="toggleStatus()"></div>
      
      <!-- For the story teller on left top. -->
      <div class="subtoken-wrapper" v-if="player.isST">
        <Token
          :role="player.role"
        />
      </div> 

      <!-- For the original token. -->
      <div class="subtoken-wrapper" v-else>
        <div class="night-order first"
            v-if="grimoire.isNightOrder && nightOrderData.firstNight">
          <em>{{ nightOrderData.firstNight }}.</em>
          <span v-if="displayRole.firstNightReminder">
            {{ displayRole.firstNightReminder }}
          </span>
        </div>

        <div class="night-order other"
            v-if="grimoire.isNightOrder && nightOrderData.otherNight">
          <em>{{ nightOrderData.otherNight }}.</em>
          <span v-if="displayRole.otherNightReminder">
            {{ displayRole.otherNightReminder }}
          </span>
        </div>

        <Token
          :role="displayRole"
          @set-role="$emit('trigger', ['openRoleModal', roleth])"
        />
      </div>

      <!-- For the sub token. -->

      <!-- Overlay icons -->
      <div class="overlay" v-if="!player.isST">

        <div class="mask-icon"
          v-if="isDisplayMask">
        </div>
        
        <font-awesome-icon
          icon="hand-paper"
          class="vote"
          title="Hand UP"
          @click="vote()"
        />
        <font-awesome-icon
          icon="times"
          class="vote"
          title="Hand DOWN"
          @click="vote()"
        />
        <font-awesome-icon
          icon="times-circle"
          class="cancel"
          title="Cancel"
          @click="cancel()"
        />
        <font-awesome-icon
          icon="exchange-alt"
          class="swap"
          @click="swapPlayer(player)"
          title="Swap seats with this player"
        />
        <font-awesome-icon
          icon="hand-point-right"
          class="nominate"
          @click="nominatePlayer(player)"
          title="Nominate this player"
        />
        <div class="marked">
          <font-awesome-icon icon="skull" />
        </div>
      </div>

      <!-- Claimed seat icon -->
       
      <template v-if="roleth !== 1 || !player.id || !loginbackend.sessionId">
        <!-- nothing. -->
      </template>

      <template v-else-if="player.id == loginbackend.playerId">
        <!-- yourself. -->
        <font-awesome-icon icon="user" class="seat" />
      </template>

      <template v-else-if="player.hasUnreadMessage">
        <!-- message not read. -->
        <font-awesome-icon icon="comment-dots" class="seat" 
          @click="readMessage()"/>
      </template>

      <template v-else-if="!player.isOnline">
        <font-awesome-icon icon="minus-circle" class="seat" />
      </template>

      <template v-else-if="player.privateChat">
        <font-awesome-icon icon="question" class="seat" />
      </template>

      <template v-else>
        <font-awesome-icon icon="chair" class="seat" :class="{ highlight: false }" />
      </template>


      <!-- Ghost vote icon -->
      <font-awesome-icon
        icon="vote-yea"
        class="has-vote"
        v-if="player.isDead && !player.isVoteless"
        @click="updatePlayer('isVoteless', true)"
        title="Ghost vote"
      />

      <!-- On block icon -->


      <div
        class="name"
        @click="isMenuOpen = !isMenuOpen"
        :class="{ active: isMenuOpen, invisible: !(roleth === 1) }"
      >
        {{ this.index == 100 ? 'ST' : this.index + 1 }}<span>{{ player.name }}</span>
      </div>


      <transition name="fold">
        <ul class="menu" v-if="isMenuOpen">
          <template v-if="!session.isSpectator">
            <!-- <li @click="changeName">
              <font-awesome-icon icon="user-edit" />Rename
            </li> -->
            <li @click="swapPlayer()" :class="{ disabled: session.lockedVote }" v-if="!player.isST">
              <font-awesome-icon icon="exchange-alt" />
              交换座位
            </li>
            <li @click="removePlayer()" :class="{ disabled: session.lockedVote }" v-if="!player.isST">
              <font-awesome-icon icon="times-circle" />
              移除座位
            </li>
            <!-- <li
              @click="updatePlayer('id', '', true)"
              v-if="player.id && loginbackend.sessionId"
            >
              <font-awesome-icon icon="chair" />
              Empty seat
            </li> -->
            <template v-if="!session.nomination && !player.isST">
              <li @click="nominatePlayer()">
                <font-awesome-icon icon="hand-point-right" />
                提名玩家
              </li>
            </template>
          </template>

          <template v-if="!session.isWatcher && player.id && player.id !== loginbackend.playerId">
            <li @click="tellPlayer()" :class="{ disabled: session.lockedVote }">
                <font-awesome-icon icon="book-dead" />
                发送私信
            </li>
            <template v-if="session.isSpectator && !player.isST">
              <li @click="privateChat()" :class="{ disabled: session.lockedVote }">
                <font-awesome-icon icon="volume-up" />
                发起私聊
              </li>
            </template>
          </template>

          <template v-if="session.isWatcher && player.id">
            <li @click="watchGrimoire()">
                <font-awesome-icon icon="question" />
                观看其视角
            </li>
          </template>
          <!-- <li
            @click="claimSeat"
            v-if="session.isSpectator"
            :class="{ disabled: player.id && player.id !== loginbackend.playerId }"
          >
            <font-awesome-icon icon="chair" />
            <template v-if="!player.id"> Claim seat </template>
            <template v-else-if="player.id === loginbackend.playerId">
              Vacate seat
            </template>
            <template v-else> Seat occupied</template>
          </li> -->
        </ul>
      </transition>
    
    </div>

    <template v-if="displayReminder && !player.isST">
      <div
        class="reminder"
        v-for="reminder in displayReminder"
        :key="reminder.role + ' ' + reminder.name"
        :class="[reminder.role]"
        @click="removeReminder(reminder)"
      >
        <span
          class="icon"
          :style="{
            backgroundImage: `url(${
              reminder.image && grimoire.isImageOptIn
                ? reminder.image
                : require(
                    '../assets/icons/' +
                      (reminder.imageAlt || reminder.role) +
                      '.png',
                  )
            })`,
          }"
        ></span>
        <span class="text">{{ reminder.name }}</span>
      </div>
    </template>

    <div class="reminder add" @click="$emit('trigger', ['openReminderModal', roleth])" v-if="!player.isST">
      <span class="icon"></span>
    </div>
    <div class="reminderHoverTarget"></div>
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
    voteLocked: function () {
      const session = this.session;
      const players = this.players.length;
      if (!session.nomination) return false;
      const indexAdjusted =
        (this.index - 1 + players - session.nomination[1]) % players;
      return indexAdjusted < session.lockedVote - 1;
    },
    zoom: function () {
      const unit = window.innerWidth > window.innerHeight ? "vh" : "vw";
      if (this.players.length < 7) {
        return { width: 18 - this.roleth*2 + this.grimoire.zoom + unit };
      } else if (this.players.length <= 10) {
        return { width: 16 - this.roleth*2 + this.grimoire.zoom + unit };
      } else if (this.players.length <= 15) {
        return { width: 14 - this.roleth*2 + this.grimoire.zoom + unit };
      } else {
        return { width: 12 - this.roleth*2 + this.grimoire.zoom + unit };
      }
    },
    isDisplayMask() {
     return this.roleth === 2;
    },
    displayRole() {
      if (this.isDisplayMask) {
        return this.player.role2;
      }
      return this.player.role;
    },
    displayReminder() {
      if (this.isDisplayMask) {
        return this.player.reminders2;
      }
      return this.player.reminders;
    },
    nightOrderData() {
      const prefix = this.isDisplayMask ? '2' : '1';
      const order = this.nightOrder.get(this.player) || {};
      return {
        firstNight: order['first' + prefix] || null,
        otherNight: order['other' + prefix] || null,
      };
    }
  },
  data() {
    return {
      isMenuOpen: false,
      isSwap: false,
    };
  },
  methods: {
    tellPlayer() {
      this.$store.commit("loginbackend/setCurrentChatIndex", this.index);
      this.$store.commit("toggleModal", "message");
      // const messag = prompt("输入给 "+this.player.name+" 发的私信消息：");
      // if (messag) {
      //   this.$store.commit("loginbackend/tellMes",{receiver: this.player.id, message: messag});
      // }
      
    },
    readMessage() {
      this.$store.commit("loginbackend/setCurrentChatIndex", this.index);
      this.$store.commit("toggleModal", "message");
    },
    privateChat() {
      this.$store.commit("session/privateChatRequest", {targetId: this.player.id, username: this.player.name});
    },
    listenPrivateChat_ST() {
      if (this.session.isSpectator) return;
      this.$store.commit("session/privateChatRequest", {targetId: this.player.id, username: this.player.name});
    },
    watchGrimoire() {
      my_alert("功能正在开发中～");
    },
    toggleStatus() {
      if (this.grimoire.isPublic) {
        if (!this.player.isDead) {
          this.updatePlayer("isDead", true);
          if (this.player.isMarked) {
            this.updatePlayer("isMarked", false);
          }
        } else if (this.player.isVoteless) {
          this.updatePlayer("isVoteless", false);
          this.updatePlayer("isDead", false);
        } else {
          this.updatePlayer("isVoteless", true);
        }
      } else {
        this.updatePlayer("isDead", !this.player.isDead);
        if (this.player.isMarked) {
          this.updatePlayer("isMarked", false);
        }
        if (this.player.isVoteless) {
          this.updatePlayer("isVoteless", false);
        }
      }
    },
    async changeName() {
      if (this.session.isSpectator) return;
      const name = await my_prompt("玩家名称", this.player.name) || this.player.name;
      this.updatePlayer("name", name, true);
    },
    removeReminder(reminder) {
      const reminders = [...this.displayReminder];
      reminders.splice(this.displayReminder.indexOf(reminder), 1);
      if(this.isDisplayMask) {
        this.updatePlayer("reminders2", reminders, true);
      }else{
        this.updatePlayer("reminders", reminders, true);
      }
      
    },
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
    removePlayer() {
      this.isMenuOpen = false;
      this.$emit("trigger", ["removePlayer"]);
    },
    swapPlayer(player) {
      this.isMenuOpen = false;
      this.$emit("trigger", ["swapPlayer", player]);
    },
    movePlayer(player) {
      this.isMenuOpen = false;
      this.$emit("trigger", ["movePlayer", player]);
    },
    nominatePlayer(player) {
      this.isMenuOpen = false;
      this.$emit("trigger", ["nominatePlayer", player]);
    },
    cancel() {
      this.$emit("trigger", ["cancel"]);
    },
    claimSeat() {
      this.isMenuOpen = false;
      this.$emit("trigger", ["claimSeat"]);
    },
    /**
     * Allow the ST to override a locked vote.
     */
    vote() {
      if (this.session.isSpectator) return;
      if (!this.voteLocked) return;
      this.$store.commit("session/voteSync", [
        this.index,
        !this.session.votes[this.index],
      ]);
    },
  },
};
</script>

<style lang="scss">
@import "../vars.scss";

.fold-enter-active,
.fold-leave-active {
  transition: transform 250ms ease-in-out;
  transform-origin: left center;
  transform: perspective(200px);
}
.fold-enter,
.fold-leave-to {
  transform: perspective(200px) rotateY(90deg);
}

/***** Player token *****/

.name.invisible {
  opacity: 0;
  pointer-events: none;
  user-select: none;
}

.circle .player {
  margin-bottom: 10px;

  &:before {
    content: " ";
    display: block;
    padding-top: 100%;
  }

  .shroud {
    top: 0;
    left: 0;
    position: absolute;
    width: 100%;
    height: 45%;
    cursor: pointer;
    transform: rotateX(0deg);
    transform-origin: top center;
    transition: transform 200ms ease-in-out;
    z-index: 2;
    filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.8));

    &:before {
      content: " ";
      background: url("../assets/shroud.png") center -10px no-repeat;
      background-size: auto 110%;
      position: absolute;
      margin-left: -50%;
      width: 100%;
      height: 100%;
      left: 50%;
      top: -30%;
      opacity: 0;
      transform: perspective(400px) scale(1.5);
      transform-origin: top center;
      transition: all 200ms;
      pointer-events: none;
    }

    #townsquare.spectator & {
      pointer-events: none;
    }

    #townsquare:not(.spectator) &:hover:before {
      opacity: 0.5;
      top: -10px;
      transform: scale(1);
    }
  }

  &.dead .shroud:before {
    opacity: 1;
    top: 0;
    transform: perspective(400px) scale(1);
  }

  #townsquare:not(.spectator) &.dead .shroud:hover:before {
    opacity: 1;
  }
}

/****** Life token *******/
.player {
  z-index: 2;
  .life {
    border-radius: 50%;
    width: 50%;
    background: url("../assets/life.png") center center;
    background-size: 100%;
    border: 3px solid black;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    cursor: pointer;
    transition: transform 200ms ease-in-out;
    transform: perspective(400px) rotateY(180deg);
    backface-visibility: hidden;
    position: absolute;
    left: 0;
    top: 0;

    &:before {
      content: " ";
      display: block;
      padding-top: 100%;
    }
  }

  &.dead {
    &.no-vote .life:after {
      display: none;
    }

    .life {
      background-image: url("../assets/death.png");

      &:after {
        content: " ";
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        background: url("../assets/vote.png") center center no-repeat;
        background-size: 50%;
        height: 100%;
        pointer-events: none;
      }
    }
  }

  &.traveler .life {
    filter: grayscale(100%);
  }
}

#townsquare.public .player {
  .shroud {
    transform: perspective(400px) rotateX(90deg);
    pointer-events: none;
  }

  .life {
    transform: perspective(400px) rotateY(0deg);
  }

  &.traveler:not(.dead) .token {
    transform: perspective(400px) scale(0.8);
    pointer-events: none;
    transition-delay: 0s;
  }

  &.traveler.dead .token {
    transition-delay: 0s;
  }
}

/***** Role token ******/

.player .token {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  transition: transform 200ms ease-in-out;
  transform: perspective(400px) rotateY(0deg);
  backface-visibility: hidden;
}

#townsquare.public .circle .token {
  transform: perspective(400px) rotateY(-180deg);
}

/****** Player choice icons *******/
.player .overlay {
  width: 100%;
  position: absolute;
  pointer-events: none;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  &:after {
    content: " ";
    display: block;
    padding-top: 100%;
  }
}
.player .overlay svg {
  position: absolute;
  filter: drop-shadow(0 0 3px black);
  z-index: 2;
  cursor: pointer;
  &.swap,
  &.move,
  &.nominate,
  &.vote,
  &.cancel {
    width: 50%;
    height: 60%;
    opacity: 0;
    pointer-events: none;
    transition: all 250ms;
    transform: scale(0.2);
    * {
      stroke-width: 10px;
      stroke: white;
      fill: url(#default);
    }
    &:hover *,
    &.fa-hand-paper * {
      fill: url(#demon);
    }
    &.fa-times * {
      fill: url(#townsfolk);
    }
  }
}

// other player voted yes, but is not locked yet
#townsquare.vote .player.vote-yes .overlay svg.vote.fa-hand-paper {
  opacity: 0.5;
  transform: scale(1);
}

// you voted yes | a locked vote yes | a locked vote no
#townsquare.vote .player.you.vote-yes .overlay svg.vote.fa-hand-paper,
#townsquare.vote .player.vote-lock.vote-yes .overlay svg.vote.fa-hand-paper,
#townsquare.vote .player.vote-lock:not(.vote-yes) .overlay svg.vote.fa-times {
  opacity: 1;
  transform: scale(1);
}

// a locked vote can be clicked on by the ST
#townsquare.vote:not(.spectator) .player.vote-lock .overlay svg.vote {
  pointer-events: all;
}

li.from:not(.nominate) .player .overlay svg.cancel {
  opacity: 1;
  transform: scale(1);
  pointer-events: all;
}

li.swap:not(.from) .player .overlay svg.swap,
li.nominate .player .overlay svg.nominate,
li.move:not(.from) .player .overlay svg.move {
  opacity: 1;
  transform: scale(1);
  pointer-events: all;
}

/****** Vote icon ********/
.player .has-vote {
  color: #fff;
  filter: drop-shadow(0 0 3px black);
  transition: opacity 250ms;
  z-index: 2;

  #townsquare.public & {
    opacity: 0;
    pointer-events: none;
  }
}

.has-vote {
  position: absolute;
  margin-top: -15%;
  right: 2px;
}

/****** Session seat glow *****/
@mixin glow($name, $color) {
  @keyframes #{$name}-glow {
    0% {
      box-shadow: 0 0 rgba($color, 1);
      border-color: $color;
    }
    50% {
      border-color: black;
    }
    100% {
      box-shadow: 0 0 20px 16px transparent;
      border-color: $color;
    }
  }

  .player.you.#{$name} .token {
    animation: #{$name}-glow 2s ease-in-out infinite;
  }
}

@include glow("townsfolk", $townsfolk);
@include glow("outsider", $outsider);
@include glow("demon", $demon);
@include glow("minion", $minion);
@include glow("traveler", $traveler);

.player.you .token {
  animation: townsfolk-glow 5s ease-in-out infinite;
}


/****** Marked icon ******/
.player .marked {
  position: absolute;
  width: 100%;
  top: 0;
  filter: drop-shadow(0px 0px 6px black);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 250ms;
  opacity: 0;
  &:before {
    content: " ";
    padding-top: 100%;
    display: block;
  }
  svg {
    height: 60%;
    width: 60%;
    position: absolute;
    stroke: white;
    stroke-width: 15px;
    path {
      fill: white;
    }
  }
}
.player.marked .marked {
  opacity: 0.5;
}

/****** Seat icon ********/
.player .seat {
  position: absolute;
  left: 2px;
  margin-top: -15%;
  color: #fff;
  filter: drop-shadow(0 0 3px black);
  cursor: default;
  z-index: 2;
  &.highlight {
    animation-iteration-count: 1;
    animation: redToWhite 1s normal forwards;
  }
}

// highlight animation
@keyframes redToWhite {
  from {
    color: $demon;
  }
  to {
    color: white;
  }
}

.player.you .seat {
  color: $townsfolk;
}

/***** Player name *****/
.player > .name {
  right: 10%;
  display: flex;
  justify-content: center;
  font-size: 100%;
  line-height: 100%;
  cursor: pointer;
  white-space: nowrap;
  width: 120%;
  background: rgba(0, 0, 0, 0.4);
  border: 3px solid black;
  border-radius: 5px;
  top: 5px;
  box-shadow: 0 0 5px black;
  padding: 0 4px;

  svg {
    top: 3px;
    margin-right: 2px;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    flex-grow: 1;
  }

  #townsquare:not(.spectator) &:hover,
  &.active {
    color: red;
  }

  &:hover .pronouns {
    opacity: 1;
    color: white;
  }

  .pronouns {
    display: flex;
    position: absolute;
    right: 110%;
    max-width: 250px;
    z-index: 25;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 10px;
    border: 3px solid black;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
    align-items: center;
    pointer-events: none;
    opacity: 0;
    transition: opacity 200ms ease-in-out;
    padding: 0 4px;
    bottom: -3px;

    &:before {
      content: " ";
      border: 10px solid transparent;
      width: 0;
      height: 0;
      border-left-color: black;
      position: absolute;
      margin-left: 2px;
      left: 100%;
    }
  }
}

.player.dead > .name {
  opacity: 0.5;
}

/***** Player menu *****/
.player > .menu {
  position: absolute;
  left: 110%;
  bottom: -5px;
  text-align: left;
  white-space: nowrap;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 5px;
  border-radius: 10px;
  border: 3px solid #000;
  margin-left: 15px;
  cursor: pointer;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);

  &:before {
    content: " ";
    width: 0;
    height: 0;
    position: absolute;
    border: 10px solid transparent;
    border-right-color: black;
    right: 100%;
    bottom: 5px;
    margin-right: 2px;
  }

  li:hover {
    color: red;
  }

  li.disabled {
    cursor: not-allowed;
    opacity: 0.5;
    &:hover {
      color: white;
    }
  }

  svg {
    margin-right: 2px;
  }
}

/***** Ability text *****/
#townsquare.public .circle .ability {
  display: none;
}
.circle .player .shroud:hover ~ .token .ability,
.circle .player .token:hover .ability {
  opacity: 1;
}

/**** Night reminders ****/
.player .night-order {
  z-index: 3;
}

.player.dead .night-order em {
  color: #ddd;
  background: linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, gray 100%);
}

/***** Reminder token *****/
.circle .reminder {
  background: url("../assets/reminder.png") center center;
  background-size: 100%;
  width: 50%;
  height: 0;
  padding-bottom: 50%;
  box-sizing: content-box;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 5px 0 0 -25%;
  border-radius: 50%;
  border: 3px solid black;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  transition: all 200ms;
  cursor: pointer;

  .text {
    line-height: 90%;
    color: black;
    font-size: 50%;
    font-weight: bold;
    text-align: center;
    margin-top: 50%;
    height: 100%;
    width: 100%;
    position: absolute;
    top: 15%;
    text-shadow:
      0 1px 1px #f6dfbd,
      0 -1px 1px #f6dfbd,
      1px 0 1px #f6dfbd,
      -1px 0 1px #f6dfbd;
  }

  .icon,
  &:after {
    content: " ";
    position: absolute;
    top: 0;
    width: 90%;
    height: 90%;
    background-size: 100%;
    background-position: center 0;
    background-repeat: no-repeat;
    background-image: url("../assets/icons/plus.png");
    transition: opacity 200ms;
  }

  &:after {
    background-image: url("../assets/icons/x.png");
    opacity: 0;
    top: 5%;
  }

  &.add {
    opacity: 0;
    top: 30px;
    &:after {
      display: none;
    }
    .icon {
      top: 5%;
    }
  }

  &.custom {
    .icon {
      display: none;
    }
    .text {
      font-size: 70%;
      word-break: break-word;
      margin-top: 0;
      display: flex;
      align-items: center;
      align-content: center;
      justify-content: center;
      border-radius: 50%;
      top: 0;
    }
  }

  &:hover:before {
    opacity: 0;
  }
  &:hover:after {
    opacity: 1;
  }
}

.circle .reminderHoverTarget {
  opacity: 0;
  width: calc(50% + 8px);
  padding-top: calc(50% + 38px);
  margin-top: calc(-25% - 33px);
  margin-left: calc(-25% - 1px);
  border-radius: 0 0 999px 999px;
  pointer-events: auto;
  transform: none !important;
  z-index: -1;
}

.circle li:hover .reminder.add {
  opacity: 1;
  top: 0;
}
.circle li:hover .reminder.add:before {
  opacity: 1;
}

#townsquare.public .reminder {
  opacity: 0;
  pointer-events: none;
}

.subtoken-wrapper {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  transition: transform 200ms ease-in-out;
  transform: perspective(400px) rotateY(0deg);
  backface-visibility: hidden;
}

.mask-icon {
  position: absolute;         /* 绝对定位 */
  top: 0;
  left: 0;
  width: 100%;                /* 宽度占满父元素 */
  height: 100%;               /* 如果需要全覆盖，建议加上高度 */
  background: url("../assets/mask.png") center center no-repeat;
  background-size: 80% auto;  /* 等比缩放，图片完整显示 */
  opacity: 0.3;               /* 半透明 */
  transition: transform 200ms ease-in-out;
  pointer-events: none;
}

</style>
