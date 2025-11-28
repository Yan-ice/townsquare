// chatroom.js  —— 完整可直接复制

const state = () => ({
    chatAppliers: new Map(),  // ownerId -> [users...]
    chatRooms: new Map(),     // ownerId -> [users...]
    myRoom: null, //referred by mediabackend
    isMute: false, 
    networkPoor: false,
    isSpeaking: false
});

const getters = {
    // 返回包含 userId 的房间 ownerId
    findChannel: (state) => (userId) => {
        // 在 chatRooms 中查找
        for (const [owner, members] of state.chatRooms.entries()) {
            if (members.includes(userId)) return owner;
        }
        // 在 chatAppliers 中查找
        for (const [owner, appliers] of state.chatAppliers.entries()) {
            if (appliers.includes(userId)) return owner;
        }
        return null;
    },

    // 返回当前玩家所在房间的 ownerId（如果有）
    myRoomId: (state, getters, rootState) => {
        const playerId = rootState.loginbackend.playerId;
        return getters.findChannel(playerId);
    },

    // 是否是当前房间的房主（myRoomId 是否等于 playerId）
    isRoomHost: (state, getters, rootState) => {
        const playerId = rootState.loginbackend.playerId;
        const roomId = getters.myRoomId;
        return roomId === playerId;
    },

    // 当前所在房间的成员列表（来自 chatRooms）
    myRoomMember: (state, getters) => {
        const roomId = getters.myRoomId;
        if (!roomId) return null;
        return state.chatRooms.get(roomId) || null;
    },

    // 当前所在房间的申请者列表（来自 chatAppliers）
    myRoomApplier: (state, getters) => {
        const roomId = getters.myRoomId;
        if (!roomId) return null;
        return state.chatAppliers.get(roomId) || null;
    },
};


// mutations helper functions
const set = (key) => (state, val) => {
    state[key] = val;
  };

const mutations = {
    joinRoom(state, {roomId}){ //listened by mediabackend
        state.isMute = true;
    },
    leaveRoom(state){ //listened by mediabackend

    },
    setMute: set("isMute"),
    setPlayerIsSpeaking: set("isSpeaking"),
    setNetworkPoor: set("networkPoor"),
    toggleMute(state) {
        state.isMute = !isMute;
    },
    // ---------- 1) 房主处理玩家申请 ----------
    processChatChannel(state, { ownerId, applierId, comment }, rootState) { //sync
        const appliers = state.chat_appliers.get(ownerId);
        const room = state.chat_rooms.get(ownerId);

        if (!appliers || !room) return;

        const idx = appliers.indexOf(applierId);
        if (idx !== -1) {
            appliers.splice(idx, 1);

            if (comment) {
                room.push(applierId);

                // 当前玩家加入房间
                if (applierId === rootState.loginbackend.playerId) {
                    state.my_room = ownerId;
                }
            }
        }
    },

    // ---------- 2) 用户申请加入房间 ----------
    applyChatChannel(state, { userId, roomId }, rootState, getters) { //sync

        // 如果用户是房主，创建房间
        if (userId === roomId) {
            state.chat_rooms.set(userId, [userId]);

            if (userId === rootState.loginbackend.playerId) {
                state.myRoom = userId;
            }
            return;
        }

        // 检查该用户是否已经在某个房间或申请列表
        if (getters.findChannel(userId)) return;

        // 添加到申请列表
        const appliers = state.chatAppliers.get(roomId);
        if (appliers) {
            appliers.push(userId);
        } else {
            state.chatAppliers.set(roomId, [userId]);
        }
    },

    // ---------- 3) 用户离开 ----------
    leaveChatChannel(state, { userId }, rootState) { //sync

        // A. 从房间中移除
        for (const [owner, members] of state.chatRooms.entries()) {
            const idx = members.indexOf(userId);

            if (idx !== -1) {
                members.splice(idx, 1);

                // 当前玩家离开
                if (userId === rootState.loginbackend.playerId) {
                    state.myRoom = null;
                }
            }
        }

        // B. 从申请列表中移除
        for (const [owner, appliers] of state.chatAppliers.entries()) {
            const idx = appliers.indexOf(userId);
            if (idx !== -1) {
                appliers.splice(idx, 1);
            }
        }
    },
};


// --------------------------------------------------------------
// 🔥 4) 注册 my_room 监听器 —— 关键部分
// --------------------------------------------------------------

export default {
    namespaced: true,
    state,
    getters,
    mutations
};
