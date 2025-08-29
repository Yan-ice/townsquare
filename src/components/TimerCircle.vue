<template>
    <ul class="info">
      <!-- 95vmin 圆扇形倒计时（居中，置底，不挡交互） -->
      <transition name="pie-fade">
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
      </transition>
    </ul>
</template>
  
  <script>
  import gameJSON from "./../game";
  import { mapState } from "vuex";
  
  export default {
    data() {
      return {
        // === 倒计时配置 ===
        showPie: false,
        totalMs: 0,       // 总时长（示例：120秒）-> 你可以改成想要的时长
        remainingMs: 0,
        timerId: null,
        pieColor: "rgba(255,255,255,0.28)",   // 扇形颜色（前景）
        pieBg: "rgba(255,255,255,0.08)",      // 背景颜色
      };
    },
    computed: {
      remainingPct() {
        // 0~1 的剩余比例
        return Math.max(0, Math.min(1, this.remainingMs / this.totalMs));
      },
      ...mapState(["edition", "grimoire", "session"]),
      ...mapState("players", ["players"]),
    },
    watch: {
      "session.totalTimer": {
        immediate: true,
        handler(totalTimer) {
          if(totalTimer > 0) {
            if(!this.showPie){
              this.totalMs = totalTimer;
              this.startCountdown();
            }
          }else{
            this.stopCountdown();
          }
        },
      },
    },
    methods: {
      startCountdown() {
        this.stopCountdown();
        const startTime = Date.now();
        const endTime = startTime + this.totalMs;
        this.showPie = true;

        this.timerId = setInterval(() => {
          const now = Date.now();
          this.remainingMs = Math.max(0, endTime - now);
          this.$store.commit("session/selfUpdateTotalTimer", this.remainingMs);

          if (this.remainingMs <= 0) {
            this.stopCountdown();
          }
        }, 100); // 仍然可以用100ms刷新界面
      },
      stopCountdown() {
        if (this.timerId) {
          clearInterval(this.timerId);
          this.timerId = null;
          this.showPie = false;
        }
      },
    },
    beforeDestroy() {
      this.stopCountdown();
    },
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
    z-index: 1; // 置于倒计时扇形之上
  
    /* === 95vmin 圆扇形倒计时 === */
    .countdown-pie {
      position: fixed;                 /* 固定在窗口中心 */
      top: 50%;
      left: 50%;
      width: 90vmin;                   /* 关键：95 * min(vw, vh) */
      height: 90vmin;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      pointer-events: none;            /* 不挡鼠标交互 */
      z-index: 0;
  
      /* 用 conic-gradient 画扇形： --pct 为 0~1 的剩余比例 */
      background:
        conic-gradient(
          var(--pie-fg, rgba(255,255,255,0.28)) calc(var(--pct) * 360deg),
          var(--pie-bg, rgba(255,255,255,0)) 0
        );
      /* 可加轻微发光 */
      filter: drop-shadow(0 0 10px rgba(0,0,0,0.35));
    }
    .pie-fade-enter-active,
    .pie-fade-leave-active {
      transition: opacity 0.6s ease;
    }
    .pie-fade-enter,
    .pie-fade-leave-to {
      opacity: 0;
    }
  }
</style>