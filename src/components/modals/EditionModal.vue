<template>
  <Modal class="editions" v-if="modals.edition" @close="toggleModal('edition')">
    <div v-if="!isCustom">
      <h3>选择剧本:</h3>
      <ul class="editions">
        <li
          v-for="edition in editions"
          class="edition"
          :class="['edition-' + edition.id]"
          :style="{
            backgroundImage: `url(${require(
              '../../assets/editions/' + edition.id + '.png',
            )})`,
          }"
          :key="edition.id"
          @click="deadlyWaltz(edition.url)"
        >
          {{ edition.name }}
        </li>
        <li
          class="edition edition-custom"
          @click="openCustom"
          :style="{
            backgroundImage: `url(${require('../../assets/editions/custom.png')})`,
          }"
        >
          自定义剧本
        </li>
      </ul>
    </div>

    <div class="custom" v-else>
      <h3>加载自定义剧本与角色</h3>

      <!-- 搜索框 -->
      <div class="search-bar">
          <input
            type="text"
            v-model="searchText"
            placeholder="搜索剧本..."
            @keyup.enter="loadScriptsFromServer"
          />
          <button @click="loadScriptsFromServer">搜索</button>
        </div>

        <!-- 滚动框 -->
        <div class="scroll-box">
          <ul class="editions">
            <li
              v-for="edition in scripts"
              class="editiongrid"
              :style="{
                backgroundImage: `url(${edition.logo})`,
              }"
              :key="edition.id"
              @click="loadJsonFromServer(edition.id)"
            >
              {{ edition.name }}
            </li>
          </ul>
        </div>

      <input
        type="file"
        ref="upload"
        accept="application/json"
        @change="handleUpload"
      />
      <div class="button-group">
        <div class="button" @click="openUpload">
          <font-awesome-icon icon="file-upload" /> 上传JSON
        </div>
        <div class="button" @click="promptURL">
          <font-awesome-icon icon="link" /> 输入URL
        </div>
        <div class="button" @click="readFromClipboard">
          <font-awesome-icon icon="clipboard" /> 从剪贴板粘贴JSON
        </div>
        <div class="button" @click="isCustom = false">
          <font-awesome-icon icon="undo" /> 返回
        </div>
      </div>
    </div>
  </Modal>
</template>

<script>
import editionJSON from "../../editions";
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";

export default {
  components: {
    Modal,
  },
  data: function () {
    return {
      editions: editionJSON,
      isCustom: false,
      scripts: [],
      searchText: "",
    };
  },
  computed: {
   ...mapState(["modals", "grimoire"]),
  },
  methods: {
    openCustom() {
      this.isCustom = true;
      this.loadScriptsFromServer();
    },
    async loadScriptsFromServer() {
      try {
        const url = "https://yanices.site/api/edition_list"; // Flask 路由
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            begin: 0,
            size: 100,
            search: this.searchText, // 可以传关键字
          }),
        });

        if (!res.ok) throw new Error("请求失败: " + res.status);

        this.scripts = await res.json();
        // scripts = [ {id, logo, name, version, author}, ... ]
      } catch (e) {
        console.error("加载scripts失败:", e);
        my_alert("加载scripts失败: " + e.message);
      }
    },
    async loadJsonFromServer(id) {
      const url = "https://yanices.site/api/edition_json/" + id; // Flask 路由
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      this.parseRoles(JSON.parse(data));
    },

    openUpload() {
      this.$refs.upload.click();
    },
    handleUpload() {
      const file = this.$refs.upload.files[0];
      if (file && file.size) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          try {
            const roles = JSON.parse(reader.result);
            this.parseRoles(roles);
          } catch (e) {
            my_alert("读取自定义剧本失败: " + e.message);
          }
          this.$refs.upload.value = "";
        });
        reader.readAsText(file);
      }
    },
    async promptURL() {
      const url = await my_prompt("输入JSON文件的URL");
      if (url) {
        this.handleURL(url);
      }
    },
    async deadlyWaltz(url) {
      if(!this.grimoire.isMaskGrimoire) {
        this.$store.commit("toggleMaskGrimoire");
      }
      this.handleURL(url);
    },
    async handleURL(url) {
      const res = await fetch(url);
      if (res && res.json) {
        try {
          const script = await res.json();
          this.parseRoles(script);
        } catch (e) {
          my_alert("加载自定义剧本失败: " + e.message);
        }
      }
    },
    async readFromClipboard() {
      const text = await navigator.clipboard.readText();
      try {
        const roles = JSON.parse(text);
        this.parseRoles(roles);
      } catch (e) {
        my_alert("读取自定义剧本失败: " + e.message);
      }
    },
    parseRoles(roles) {
      if (!roles || !roles.length) return;

        // 如果 roles 是字符串，先解析一次
      if (typeof roles === "string") {
        try {
          roles = JSON.parse(roles);
        } catch (e) {
          console.error("parseRoles: 无法解析 JSON 字符串:", roles);
          return;
        }
      }

      roles = roles.map((role) =>
        typeof role === "string" ? { id: role } : role,
      );
      const metaIndex = roles.findIndex(({ id }) => id === "_meta");
      let meta = {};
      if (metaIndex > -1) {
        meta = roles.splice(metaIndex, 1).pop();
      }
      this.$store.commit("setCustomRoles", roles);
      this.$store.commit(
        "setEdition",
        Object.assign({}, meta, { id: "custom" }),
      );
      // check for fabled and set those too, if present
      if (roles.some((role) => this.$store.state.fabled.has(role.id || role))) {
        const fabled = [];
        roles.forEach((role) => {
          if (this.$store.state.fabled.has(role.id || role)) {
            fabled.push(this.$store.state.fabled.get(role.id || role));
          }
        });
        this.$store.commit("players/setFabled", { fabled });
      }
      this.isCustom = false;
    },
    ...mapMutations(["toggleModal", "toggleMaskGrimoire", "setEdition"]),
  },
};
</script>

<style scoped lang="scss">
ul.editions .edition {
  font-family: PiratesBay, sans-serif;
  letter-spacing: 1px;
  text-align: center;
  padding-top: 25%;
  background-position: center center;
  background-size: 100% auto;
  background-repeat: no-repeat;
  width: 55%;
  margin: 5px;
  font-size: 120%;
  text-shadow:
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000,
    0 0 5px rgba(0, 0, 0, 0.75);
  cursor: pointer;
  &:hover {
    color: red;
  }
}
.search-bar {
  width: 80%;
  margin: 10px 0;
  display: flex;
  gap: 10px;

  input {
    flex: 1;
    padding: 6px 10px;
    font-size: 14px;
    border: 1px solid #aaa;
    border-radius: 4px;
  }

  button {
    padding: 6px 12px;
    background: #444;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background: #666;
    }
  }
}

.scroll-box {
  width: 90%;
  max-height: 60vh; // 限定高度
  overflow-y: auto;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 5px;
  background: rgba(0, 0, 0, 0.2);
}

.custom {
  text-align: center;
  input[type="file"] {
    display: none;
  }
  .scripts {
    list-style-type: disc;
    font-size: 120%;
    cursor: pointer;
    display: block;
    width: 50%;
    text-align: left;
    margin: 10px auto;
    li:hover {
      color: red;
    }
  }
}

.editiongrid {
  width: 200px;
  height: 120px;
  border: 1px solid #fff;
  border-radius: 4px;
  background-position: center center;   // 纵向居上
  background-size: 100% auto;        // 宽度撑满，高度按比例
  background-repeat: no-repeat;
  display: flex;
  align-items: flex-end;  // 文字靠底部
  justify-content: center;
  color: #fff;
  font-weight: bold;
  text-shadow:
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000,
    0 0 5px rgba(0, 0, 0, 0.75);
  cursor: pointer;
  transition: transform 0.2s;
  margin: 10px;

  &:hover {
    transform: scale(1.05);    // 悬停轻微放大
    border-color: #fffa;       // 悬停时边框微透明变化
  }
}
</style>
