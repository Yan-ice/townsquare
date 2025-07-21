import Vue from "vue";
import App from "./App";
import store from "./store";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

const faIcons = [
  "AddressCard",
  "BookOpen",
  "BookDead",
  "BroadcastTower",
  "Chair",
  "CheckSquare",
  "CloudMoon",
  "Cog",
  "Ban",
  "Copy",
  "Clipboard",
  "Dice",
  "Dragon",
  "ExchangeAlt",
  "ExclamationTriangle",
  "FileCode",
  "FileUpload",
  "HandPaper",
  "HandPointRight",
  "Heartbeat",
  "Image",
  "Link",
  "MinusCircle",
  "PeopleArrows",
  "PlusCircle",
  "Question",
  "Random",
  "RedoAlt",
  "SearchMinus",
  "SearchPlus",
  "Skull",
  "Square",
  "TheaterMasks",
  "Times",
  "TimesCircle",
  "TrashAlt",
  "Undo",
  "User",
  "UserEdit",
  "UserFriends",
  "Users",
  "VenusMars",
  "VolumeUp",
  "VolumeMute",
  "VoteYea",
  "WindowMaximize",
  "WindowMinimize",
  "CommentDots",
  "Microphone",
  "MicrophoneSlash"
];
const fabIcons = ["Github", "Discord"];
library.add(
  ...faIcons.map((i) => fas["fa" + i]),
  ...fabIcons.map((i) => fab["fa" + i]),
);
Vue.component("font-awesome-icon", FontAwesomeIcon);
Vue.config.productionTip = false;
Vue.config.devtools = true


// 这里是关键，挂载到window是为了方便在任何地方调用，非必须
window.my_alert = function (message, title = "提示") {
  return new Promise((resolve) => {
    console.log("my_alert", message, title);
    store.commit("setDialog", {
      visible: true,
      title,
      message,
      type: "alert",
      resolve: () => resolve(),
    });
  });
};

window.my_confirm = function (message, title = "确认") {
  return new Promise((resolve) => {
    console.log("my_confirm", message, title);
    store.commit("setDialog", {
      visible: true,
      title,
      message,
      type: "confirm",
      resolve,
    });
  });
};

window.my_prompt = function (message, title = "输入", defaultValue = "") {
  return new Promise((resolve) => {
    console.log("my_prompt", message, title);
    store.commit("setDialog", {
      visible: true,
      title,
      message,
      type: "prompt",
      defaultValue,
      resolve,
    });
  });
};

new Vue({
  render: (h) => h(App),
  store,
}).$mount("#app");
