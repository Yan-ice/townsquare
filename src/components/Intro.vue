<template>
  <div class="intro">
    <img src="static/apple-icon.png" alt="" class="logo" />
    <div>
      欢迎使用 染·钟楼谜团 线上(非官方)语音魔典！<br>
      这是一个新房间，你是该房间的说书人。<br>
      你可以通过
      <span class="button" @click="toggleMenu">
        <font-awesome-icon icon="cog" /> 菜单
      </span>
      进行添加座位、选择剧本等。<br><br>

      如果您提供了麦克风权限，您将与玩家语音聊天。
      <div class="footer">
        这是一个开源项目，源码可以在
        <a href="https://github.com/yan-ice/townsquare" target="_blank">GitHub</a> 中获取。它与The Pandemonium Institute没有任何关联。“染·钟楼谜团”是Steven Medway和The Pandemonium的商标, 在国内由"集石"代理。
      </div>
    </div>
  </div>
</template>

<script>
import { mapMutations } from "vuex";

export default {
  data() {
    return {
      language: window.navigator.userLanguage || window.navigator.language,
    };
  },
  methods: mapMutations(["toggleMenu"]),
};
</script>

<style scoped lang="scss">
// Intro
.intro {
  text-align: center;
  width: 50%;
  font-size: 120%;
  position: absolute;
  padding: 10px;
  background: rgba(0, 0, 0, 0.5);
  border: 3px solid black;
  border-radius: 10px;
  z-index: 3;
  display: flex;
  justify-content: center;
  a {
    color: white;
  }
  a.redirect {
    display: block;
    text-decoration: none;
    position: absolute;
    top: 100%;
    margin-top: 2vh;
    padding: 10px;
    background: rgba(0, 0, 0, 0.5);
    border: 3px solid black;
    border-radius: 10px;

    &:hover {
      color: red;
    }
    img {
      width: 120px;
      display: block;
      margin: auto;
      margin-bottom: 1vh;
    }
  }

  img.logo {
    position: absolute;
    bottom: 100%;
    width: 25vh;
    margin-bottom: 2vh;
    max-width: 192px;
    border-radius: 50%;
    box-shadow: 0 0 10px black;
    border: 3px solid black;
  }
  .footer {
    font-size: 60%;
    opacity: 0.75;
  }
}
</style>
