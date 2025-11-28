// chat.js
import Vue from "vue";

const state = () => ({
    chatAppliers: {},  // ownerId -> array of users
    chatRooms: {},     // ownerId -> array of users  
    isMute: false, 
    networkPoor: false,
    isSpeaking: false
});

// helper 查找用户所在房间（返回 ownerId 或 null）
function findChannel(state, userId) {
    for (const ownerId in state.chatRooms) {
        if (state.chatRooms[ownerId].includes(userId)) return ownerId;
    }
    for (const ownerId in state.chatAppliers) {
        if (state.chatAppliers[ownerId].includes(userId)) return ownerId;
    }
    return null;
}

const getters = {
    // 返回当前玩家所在房间的 ownerId（如果有）
    myRoomId: (state, getters, rootState) => {
        const playerId = rootState.loginbackend.playerId;
        return findChannel(state, playerId);
    },

    // 是否是当前房间的房主（myRoomId 是否等于 playerId）
    isRoomHost: (state, getters, rootState) => {
        const playerId = rootState.loginbackend.playerId;
        const roomId = getters.myRoomId;
        return roomId === playerId;
    },

    // 是否是申请中
    isApplying: (state, getters, rootState) => {
        const playerId = rootState.loginbackend.playerId;
        const roomId = getters.myRoomId;
        if (roomId && state.chatAppliers[roomId]) {
            return state.chatAppliers[roomId].includes(playerId);
        }
        return false;
    },

    // 当前所在房间的成员列表（来自 chatRooms）
    myRoomMember: (state, getters) => {
        const roomId = getters.myRoomId;
        if (!roomId) return null;
        return state.chatRooms[roomId] || [];
    },

    // 当前所在房间的申请者列表（来自 chatAppliers）
    myRoomApplier: (state, getters) => {
        const roomId = getters.myRoomId;
        if (!roomId) return null;
        return state.chatAppliers[roomId] || [];
    },
};

const set = (key) => (state, val) => {
    state[key] = val;
};

const mutations = {
    joinRoom(state, { roomId }) { //subscribed
        state.isMute = true;
    },

    leaveRoom(state) { }, //subscribed

    setMute: set("isMute"),
    setPlayerIsSpeaking: set("isSpeaking"),
    setNetworkPoor: set("networkPoor"),

    toggleMute(state) {
        state.isMute = !state.isMute;
    },

    // ---------- 1) 房主处理玩家申请 ----------
    processChatChannel(state, { ownerId, applierId, comment }) {
        const appliers = state.chatAppliers[ownerId];
        const room = state.chatRooms[ownerId];

        if (!appliers || !room) return;

        const idx = appliers.indexOf(applierId);
        if (idx !== -1) {
            appliers.splice(idx, 1);

            if (comment) {
                room.push(applierId);
            }
        }
    },

    // ---------- 2) 用户申请加入房间 ----------
    applyChatChannel(state, { userId, roomId }) {
        console.log("apply chat "+userId+" "+roomId);

        // 初始化房间对象
        if (!state.chatRooms[roomId]) {
            Vue.set(state.chatRooms, roomId, []);
            Vue.set(state.chatAppliers, roomId, []);
        }

        // 检查用户是否已经在某个房间或申请列表
        if (findChannel(state, userId)) return;

        // 如果用户是房主，直接加入房间
        if (userId === roomId) {
            state.chatRooms[roomId].push(userId);
            return;
        }

        // 添加到申请列表
        state.chatAppliers[roomId].push(userId);
    },

    // ---------- 3) 用户离开 ----------
    leaveChatChannel(state, { userId }, rootState) {

        // A. 从房间中移除
        for (const owner in state.chatRooms) {
            const idx = state.chatRooms[owner].indexOf(userId);
            if (idx !== -1) state.chatRooms[owner].splice(idx, 1);
        }

        // B. 从申请列表中移除
        for (const owner in state.chatAppliers) {
            const idx = state.chatAppliers[owner].indexOf(userId);
            if (idx !== -1) state.chatAppliers[owner].splice(idx, 1);
        }
    },
};

export default {
    namespaced: true,
    state,
    getters,
    mutations
};
