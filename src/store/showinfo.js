
const state = () => ({
    keynote: "",
    numbers: [],
    characters: [],
    yesOrNo: 0,
    openInfo: false
});

// mutations helper functions
const set = (key) => (state, val) => {
    state[key] = val;
  };


const mutations = {
    setKeynote: set("keynote"),
    setNumbers: set("numbers"),
    setCharacters: set("characters"),
    setYesOrNo: set("yesOrNo"),
    setOpenInfo: set("openInfo"),
};

export default {
    namespaced: true,
    state,
    mutations,
  };
  
