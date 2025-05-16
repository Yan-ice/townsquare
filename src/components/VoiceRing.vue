<template>
    <div class="voice-ring">
      <!-- 波纹动画圈 -->
      <transition-group name="pulse" tag="div" class="pulse-container">
        <div
          v-for="ring in rings"
          :key="ring.id"
          class="pulse-ring"
          :style="{
            transform: `scale(${ring.scale})`,
            opacity: ring.opacity,
          }"
        ></div>
      </transition-group>
  
      <!-- 用户头像区域 -->
      <div class="avatar-wrapper">
        <slot></slot>
      </div>
    </div>
  </template>
  
<script setup>
  import { ref, onBeforeUnmount, watch } from 'vue';
  
  const props = defineProps({
    volume: {
      type: Number,
      default: 0,
    },
    isLoud: {
      type: Boolean,
      default: false,
    },
  });
  
  const rings = ref([]);
  let ringId = 0;
  let animationFrame;
  
  function spawnRing() {
    const id = ringId++;
    const ring = {
      id,
      scale: 1,
      opacity: 0.6 + props.volume * 0.4,
    };
    rings.value.push(ring);
  
    let start = null;
    const duration = 1000; // ms
  
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = elapsed / duration;
  
      ring.scale = 1 + progress * 1.5; // 扩散比例
      ring.opacity = Math.max(0, 0.6 - progress); // 渐隐
  
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        rings.value = rings.value.filter((r) => r.id !== id);
      }
    };
  
    animationFrame = requestAnimationFrame(animate);
  }
  
defineExpose({
  spawnRing,
});

  // 每当 volume 高于某阈值，就生成一个 pulse ring
  watch(
    () => props.volume,
    (newVal) => {
      if (newVal > 0.05) {
        spawnRing();
      }
    }
  );
  
  onBeforeUnmount(() => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
  });
  </script>
  
  <style scoped>
  .voice-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: visible;
    pointer-events: none;
  }
  
  .avatar-wrapper {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    z-index: 2;
  }
  
  .pulse-container {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    z-index: 1;
  }
  
  .pulse-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    border: 4px solid #3b82f6;
    border-radius: 50%;
    top: 0;
    left: 0;
    transform-origin: center;
    transition: transform 1s linear, opacity 1s ease-out;
  }
  </style>
  