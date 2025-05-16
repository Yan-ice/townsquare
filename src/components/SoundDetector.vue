<template>
  <div class="audio-indicator">
    <button @click="startListening">🎙️ 开始监听</button>
    <span v-if="isLoud">🔊 检测到声音</span>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from "vue";
import { useStore } from "vuex";

const isLoud = ref(false);
const volume = ref(0);
const store = useStore(); // 访问 Vuex

let audioContext;
let analyser;
let microphone;
let dataArray;
let animationFrameId;

const startListening = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    analyser.fftSize = 512;

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    const checkVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      const average =
        dataArray.reduce((sum, val) => sum + val, 0) / bufferLength;

      isLoud.value = average > 20;
      volume.value = isLoud.value ? Math.min(1, average / 100) : 0;

      // 更新 Vuex 中 players 的 isSpeaking 状态
      store.commit("loginbackend/setPlayerIsSpeaking", isLoud.value);

      animationFrameId = requestAnimationFrame(checkVolume);
    };

    checkVolume();
  } catch (err) {
    alert("无法访问麦克风：" + err.message);
  }
};

onBeforeUnmount(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (audioContext) audioContext.close();
});
</script>

<style scoped>
.audio-indicator {
  font-size: 24px;
  margin: 20px;
}
</style>
