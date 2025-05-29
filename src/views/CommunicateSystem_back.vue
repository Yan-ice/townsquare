<template>
    <div class="container">
        <h1 class="text-2xl font-semibold text-center mb-6 text-gray-800">多人实时语音 (火山引擎RTC版)</h1>

        <div class="border-b pb-4 mb-4">
            <h2 class="text-lg font-medium text-gray-700 mb-2">1. 基本配置</h2>
            <div class="mb-2">
                <label for="appId" class="block text-sm font-medium text-gray-700">火山引擎 AppID:</label>
                <input type="text" id="appId" v-model="appId" class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="请输入您的AppID">
            </div>
            <div class="mb-2">
                <label for="userId" class="block text-sm font-medium text-gray-700">用户ID (自定义):</label>
                <input type="text" id="userId" v-model="userId" class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="例如: user_alice">
            </div>
            <div class="mb-2">
                <label for="tokenServerUrl" class="block text-sm font-medium text-gray-700">Token 获取服务器地址 (后端实现):</label>
                <input type="text" id="tokenServerUrl" v-model="tokenServerUrl" class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="例如: http://localhost:3001/get-token">
                 <p class="text-xs text-gray-500 mt-1">该服务器需您自行搭建，用于生成加入房间的Token。</p>
            </div>
        </div>

        <div class="border-b pb-4 mb-4">
            <h2 class="text-lg font-medium text-gray-700 mb-2">2. 加入/离开房间</h2>
            <div class="mb-2">
                <label for="roomId" class="block text-sm font-medium text-gray-700">房间号:</label>
                <input type="text" id="roomId" v-model="roomId" :disabled="isInRoom" class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100" placeholder="例如：room123">
            </div>
            <div class="flex space-x-2">
                <button @click="joinRoomHandler" :disabled="!appId || !userId || !roomId || isInRoom || !tokenServerUrl" class="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                    {{ isInRoom ? '已在房间' : '加入房间' }}
                </button>
                <button @click="leaveRoomHandler" :disabled="!isInRoom" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                    离开房间
                </button>
            </div>
             <div v-if="isInRoom" class="mt-2 text-sm text-gray-600">
                当前房间: <span class="font-semibold">{{ currentRoomIdDisplay }}</span> | 用户: <span class="font-semibold">{{ userId }}</span>
            </div>
        </div>
        
        <div class="pb-4 mb-4">
            <h2 class="text-lg font-medium text-gray-700 mb-2">3. 音频控制</h2>
            <div class="flex space-x-2 mb-2">
                <button @click="publishAudioHandler" :disabled="!isInRoom || isAudioPublished || isPublishingAudio" class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                    {{ isPublishingAudio ? '开启中...' : (isAudioPublished ? '音频已开启' : '开启麦克风') }}
                </button>
                <button @click="unpublishAudioHandler" :disabled="!isAudioPublished" class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                    关闭麦克风
                </button>
            </div>
            <div class="mb-2">
                <label for="sdkNoiseReductionToggle" class="flex items-center cursor-pointer">
                    <span class="mr-3 text-sm font-medium text-gray-900">SDK AI降噪 (若支持)</span>
                    <input type="checkbox" id="sdkNoiseReductionToggle" v-model="sdkNoiseReductionEnabled" @change="toggleSdkNoiseReduction" :disabled="!isAudioPublished" class="form-checkbox h-5 w-5 text-blue-600 rounded disabled:opacity-50">
                </label>
                 <p class="text-xs text-gray-500 mt-1">控制SDK的AI降噪功能。具体效果和可用性取决于SDK版本。</p>
            </div>
            <div class="mb-2 text-sm text-gray-600">
                本地音频状态:
                <span :class="['status-dot', localAudioStatusDotClass]"></span>
                {{ localAudioStatus }}
            </div>
            <div>
                <p class="text-sm font-medium text-gray-700">本地麦克风音量:</p>
                <canvas id="localAudioVisualizer"></canvas>
            </div>
        </div>

        <div class="remote-audio-container">
            <h2 class="text-lg font-medium text-gray-700 mb-2">房间内其他用户 ({{ remoteUsers.size }})</h2>
            <div v-if="remoteUsers.size === 0 && isInRoom" class="text-sm text-gray-500">房间内暂无其他用户。</div>
            <div v-for="([uid, user]) in remoteUsers" :key="uid" class="remote-user">
                <p>用户: <span class="font-semibold">{{ uid }}</span> - 状态: {{ user.audioState }}</p>
                <div :id="'remote-audio-' + uid"></div>
            </div>
        </div>

        <div v-if="infoMessage" class="mt-4 p-3 bg-blue-100 text-blue-700 border border-blue-300 rounded-md text-sm">
            {{ infoMessage }}
        </div>
        <div v-if="errorMessage" class="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md text-sm">
            错误: {{ errorMessage }}
        </div>
    </div>
</template>

<script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <script src="https://unpkg.com/@volcengine/vertc-rtc-web@3.56.1/datachannel/umd/VERTC.js"></script>
    <style>
        body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; background-color: #f3f4f6; margin: 0; padding: 1rem;}
        .container { background-color: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 550px; margin-top: 1rem; }
        button { transition: background-color 0.3s, opacity 0.3s; }
        .status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 8px; vertical-align: middle; }
        .status-connected { background-color: #22c55e; }
        .status-disconnected { background-color: #ef4444; }
        .status-processing { background-color: #eab308; }
        .status-pending { background-color: #3b82f6; }
        #localAudioVisualizer, .remote-audio-container div { width: 100%; height: 60px; background-color: #e5e7eb; border-radius: 0.25rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
        .user-list { max-height: 120px; overflow-y: auto; background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 0.5rem; border-radius: 0.25rem; }
        .user-list li { padding: 0.25rem 0; font-size: 0.875rem; }
        .remote-audio-container { margin-top: 1rem; }
        .remote-user { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.25rem; margin-bottom: 0.5rem; }
        .remote-user p { font-size: 0.9rem; }
    </style>

<script>
        const { createApp, ref, reactive, computed, onBeforeUnmount, watch } = Vue;
        // const VERTC = window.VERTC; // Ensure VERTC SDK is loaded globally or imported

        const App = {
            setup() {
                const appId = ref(localStorage.getItem('volcAppId') || '');
                const userId = ref(localStorage.getItem('volcUserId') || `user_${Math.floor(Math.random() * 10000)}`);
                const roomId = ref(localStorage.getItem('volcRoomId') || '');
                const tokenServerUrl = ref(localStorage.getItem('volcTokenServerUrl') || 'http://localhost:3001/get-token'); // Placeholder
                const token = ref('');

                const rtcEngine = ref(null);
                const localAudioStream = ref(null);
                
                const isInRoom = ref(false);
                const currentRoomIdDisplay = ref('');
                const isAudioPublished = ref(false);
                const isPublishingAudio = ref(false); // For UI feedback
                const sdkNoiseReductionEnabled = ref(true); // Default, SDK might override

                const remoteUsers = reactive(new Map()); // Store remote users: Map<userId, { audioStream?: MediaStream, audioState: string }>

                const infoMessage = ref('');
                const errorMessage = ref('');

                // --- SDK Engine and Room Management ---
                const createEngine = () => {
                    if (!VERTC) {
                        errorMessage.value = "火山引擎 RTC SDK 未加载!";
                        console.error("VERTC SDK is not loaded.");
                        return null;
                    }
                    if (!appId.value) {
                        errorMessage.value = "请输入 AppID!";
                        return null;
                    }
                    const engine = VERTC.createEngine(appId.value);
                    console.log("RTC Engine created");
                    infoMessage.value = "RTC引擎已创建。";
                    setupEngineEventListeners(engine);
                    return engine;
                };

                const fetchToken = async (uid, rid) => {
                    if (!tokenServerUrl.value) {
                        errorMessage.value = "请输入Token服务器地址。";
                        throw new Error("Token server URL is not set.");
                    }
                    try {
                        // IMPORTANT: In a real app, the token server URL might need query params like ?uid=${uid}&channelName=${rid}
                        // The backend server would then generate a token specific to this user and room.
                        const response = await fetch(`${tokenServerUrl.value}?appId=${appId.value}&userId=${uid}&roomId=${rid}`);
                        if (!response.ok) {
                            const errorData = await response.text();
                            throw new Error(`获取Token失败: ${response.status} - ${errorData}`);
                        }
                        const data = await response.json();
                        if (!data.token) {
                            throw new Error("Token服务器未返回有效Token。");
                        }
                        console.log("Token fetched successfully:", data.token);
                        return data.token;
                    } catch (error) {
                        console.error("Fetch token error:", error);
                        errorMessage.value = `获取Token出错: ${error.message}`;
                        throw error;
                    }
                };

                const joinRoomHandler = async () => {
                    if (!appId.value || !userId.value || !roomId.value) {
                        errorMessage.value = "AppID, UserID 和 RoomID 不能为空。";
                        return;
                    }
                    infoMessage.value = `正在加入房间 ${roomId.value}...`;
                    errorMessage.value = '';

                    if (!rtcEngine.value) {
                        rtcEngine.value = createEngine();
                        if (!rtcEngine.value) return; // Error handled in createEngine
                    }
                    
                    try {
                        token.value = await fetchToken(userId.value, roomId.value);
                        if (!token.value) return; // Error handled in fetchToken

                        // 开启音频采集设备测试，可选，但有助于提前发现问题
                        // await rtcEngine.value.startAudioCaptureDeviceTest( (level) => { console.log('本地麦克风音量:', level); });
                        // await rtcEngine.value.stopAudioCaptureDeviceTest();

                        await rtcEngine.value.joinRoom(token.value, roomId.value, { userId: userId.value });
                        console.log(`Successfully called joinRoom for room ${roomId.value}`);
                        // isInRoom will be set by 'join-room-success' event
                    } catch (error) {
                        console.error("Join room failed:", error);
                        errorMessage.value = `加入房间失败: ${error.message || '请检查控制台日志。'}`;
                        infoMessage.value = '';
                    }
                };

                const leaveRoomHandler = async () => {
                    if (!rtcEngine.value || !isInRoom.value) return;
                    infoMessage.value = "正在离开房间...";
                    try {
                        if (isAudioPublished.value) {
                            await unpublishAudioHandler(false); // Unpublish first, silent
                        }
                        await rtcEngine.value.leaveRoom();
                        console.log("Successfully called leaveRoom");
                        // isInRoom will be set by 'leave-room' event
                    } catch (error) {
                        console.error("Leave room failed:", error);
                        errorMessage.value = `离开房间失败: ${error.message}`;
                    }
                };

                // --- Audio Publishing ---
                const publishAudioHandler = async () => {
                    if (!rtcEngine.value || !isInRoom.value || isAudioPublished.value) return;
                    isPublishingAudio.value = true;
                    infoMessage.value = "正在开启麦克风...";
                    try {
                        // 创建本地音频流 (SDK会自动采集)
                        // SDK v3.45+ uses publishStream/unpublishStream for audio/video respectively
                        // For older versions, it might be enableLocalAudio / publish
                        // Check Volcengine docs for the version you are using.
                        // Assuming a recent version:
                        await rtcEngine.value.startAudioCapture(); // Start capturing audio
                        
                        // AI Noise Reduction can be enabled before publishing or via engine settings
                        // This is an example, the exact API might differ.
                        // Refer to Volcengine documentation for "setAudioProfile", "enableANS", etc.
                        // Example: rtcEngine.value.setAudioProfile({ scenario: 'music', profile: 'high_quality_stereo' });
                        //          rtcEngine.value.enableAudioProcessor({ type: 'ANS', enable: sdkNoiseReductionEnabled.value });
                        // Or, it might be part of createMicrophoneAudioStream options.
                        
                        // For SDKs using publishStream:
                        // localAudioStream.value = await VERTC.createStream({ audio: true, video: false }); // Create a stream object
                        // await rtcEngine.value.publishStream(localAudioStream.value.mediaStream); // Publish the MediaStream

                        // For SDKs using simpler publish for audio:
                        await rtcEngine.value.publish("audio"); // Publishes the internally captured audio
                        
                        console.log("Audio published successfully");
                        isAudioPublished.value = true;
                        infoMessage.value = "麦克风已开启。";
                        startLocalAudioVisualization(); // Start visualizing local audio
                    } catch (error) {
                        console.error("Publish audio failed:", error);
                        errorMessage.value = `开启麦克风失败: ${error.message}`;
                        infoMessage.value = '';
                    } finally {
                        isPublishingAudio.value = false;
                    }
                };

                const unpublishAudioHandler = async (showMessages = true) => {
                    if (!rtcEngine.value || !isAudioPublished.value) return;
                    if (showMessages) infoMessage.value = "正在关闭麦克风...";
                    try {
                        // await rtcEngine.value.unpublishStream(localAudioStream.value.mediaStream); // If using publishStream
                        await rtcEngine.value.unpublish("audio"); // If using publish("audio")
                        await rtcEngine.value.stopAudioCapture();

                        console.log("Audio unpublished successfully");
                        isAudioPublished.value = false;
                        if (showMessages) infoMessage.value = "麦克风已关闭。";
                        stopLocalAudioVisualization();
                    } catch (error) {
                        console.error("Unpublish audio failed:", error);
                        if (showMessages) errorMessage.value = `关闭麦克风失败: ${error.message}`;
                    }
                };

                const toggleSdkNoiseReduction = async () => {
                    if (!rtcEngine.value || !isAudioPublished.value) {
                        // sdkNoiseReductionEnabled.value = !sdkNoiseReductionEnabled.value; // revert UI
                        // infoMessage.value = "请先开启麦克风再设置降噪。";
                        return;
                    }
                    try {
                        // Example: This API might vary. Consult Volcengine documentation.
                        // await rtcEngine.value.enableAudioProcessor({ type: 'ANS', enable: sdkNoiseReductionEnabled.value });
                        // Or, it might be:
                        // await rtcEngine.value.setAudioAlgorithmParameter({type: 'ANS', parameter: {enable: sdkNoiseReductionEnabled.value}})
                        // For now, this is a placeholder. The actual method depends on the SDK version.
                        console.log(`尝试设置 SDK AI 降噪为: ${sdkNoiseReductionEnabled.value}`);
                        infoMessage.value = `SDK AI 降噪已${sdkNoiseReductionEnabled.value ? '尝试开启' : '尝试关闭'} (具体API请查阅文档)。`;
                        // You might need to re-publish or the SDK handles it dynamically.
                    } catch (error) {
                        console.error("Toggle SDK Noise Reduction failed:", error);
                        errorMessage.value = `设置SDK降噪失败: ${error.message}`;
                    }
                };

                // --- Engine Event Listeners ---
                const setupEngineEventListeners = (engine) => {
                    engine.on('join-room-success', (data) => {
                        console.log('Event: join-room-success', data);
                        isInRoom.value = true;
                        currentRoomIdDisplay.value = data.roomId;
                        userId.value = data.userId; // Confirm user ID from join success
                        infoMessage.value = `成功加入房间: ${data.roomId}`;
                        localStorage.setItem('volcAppId', appId.value);
                        localStorage.setItem('volcUserId', userId.value);
                        localStorage.setItem('volcRoomId', roomId.value);
                        localStorage.setItem('volcTokenServerUrl', tokenServerUrl.value);
                    });

                    engine.on('leave-room', (data) => {
                        console.log('Event: leave-room', data);
                        isInRoom.value = false;
                        currentRoomIdDisplay.value = '';
                        isAudioPublished.value = false;
                        remoteUsers.clear();
                        infoMessage.value = `已离开房间。原因: ${data.reason}`;
                        stopLocalAudioVisualization();
                    });

                    engine.on('user-joined', (data) => {
                        console.log('Event: user-joined', data);
                        // No automatic subscription, wait for 'stream-added'
                        infoMessage.value = `用户 ${data.userId} 加入房间。`;
                    });

                    engine.on('user-left', (data) => {
                        console.log('Event: user-left', data);
                        if (remoteUsers.has(data.userId)) {
                            remoteUsers.delete(data.userId);
                        }
                        infoMessage.value = `用户 ${data.userId} 离开房间。`;
                    });

                    engine.on('stream-added', async (data) => { // Remote stream published
                        console.log('Event: stream-added', data);
                        if (data.userId === userId.value) return; // Ignore own stream
                        
                        try {
                            infoMessage.value = `正在订阅用户 ${data.userId} 的 ${data.mediaType} 流...`;
                            // For SDKs using subscribeStream:
                            // const remoteStream = await engine.subscribeStream(data.userId, data.mediaType);
                            // if (data.mediaType === 'audio') {
                            //    remoteUsers.set(data.userId, { audioStream: remoteStream, audioState: 'Subscribed' });
                            //    remoteStream.play(`remote-audio-${data.userId}`); // SDK handles playback
                            // }
                            
                            // For SDKs using simpler subscribe:
                            if (data.mediaType === 'audio') {
                                await engine.subscribe(data.userId, "audio");
                                remoteUsers.set(data.userId, { audioState: '订阅中...' });
                                // Playback is often automatic or via a 'stream-subscribed' event.
                            }
                            console.log(`Subscribed to ${data.mediaType} from ${data.userId}`);
                        } catch (error) {
                            console.error(`Subscribe to stream from ${data.userId} failed:`, error);
                            errorMessage.value = `订阅 ${data.userId} 的流失败: ${error.message}`;
                        }
                    });
                    
                    engine.on('stream-subscribed', (data) => { // Successfully subscribed to a remote stream
                        console.log('Event: stream-subscribed', data);
                        if (data.mediaType === 'audio' && data.userId !== userId.value) {
                            remoteUsers.set(data.userId, { audioState: '已订阅，播放中' });
                            // SDK usually handles playback automatically.
                            // If manual playback is needed for the stream object from 'stream-added':
                            // data.stream.play(`remote-audio-${data.userId}`);
                            // Create a div for potential volume visualization for this remote user
                            const playerContainer = document.getElementById(`remote-audio-${data.userId}`);
                            if (playerContainer) {
                                // SDK might provide methods to attach stream to a media element, or plays automatically.
                                // For visualization, you might get volume levels from SDK events.
                                playerContainer.innerHTML = `<p class="text-xs text-green-600">正在播放 ${data.userId} 的音频</p>`;
                            }
                        }
                    });

                    engine.on('stream-removed', (data) => { // Remote stream unpublished
                        console.log('Event: stream-removed', data);
                        if (remoteUsers.has(data.userId)) {
                            // If you stored a stream object, you might need to call stream.stop() or similar.
                            remoteUsers.set(data.userId, { ...remoteUsers.get(data.userId), audioState: '流已移除' });
                            // SDK usually handles stopping playback.
                            const playerContainer = document.getElementById(`remote-audio-${data.userId}`);
                            if (playerContainer) playerContainer.innerHTML = ''; // Clear visualization
                        }
                        infoMessage.value = `用户 ${data.userId} 的 ${data.mediaType} 流已停止。`;
                    });
                    
                    engine.on('error', (error) => {
                        console.error('RTC Engine Error:', error);
                        // Error codes: https://www.volcengine.com/docs/6348/70083
                        errorMessage.value = `RTC 引擎错误: (${error.errorCode}) ${error.message || '未知错误'}`;
                    });

                    engine.on('connection-state-changed', (data) => {
                        console.log('Event: connection-state-changed', data);
                        infoMessage.value = `连接状态改变: ${data.state}, 原因: ${data.reason}`;
                    });

                    engine.on('audio-volume-indication', (data) => {
                        // data is an array of { userId: string, volume: number }
                        data.forEach(item => {
                            if (item.userId === userId.value || item.userId === 'local_preview_uid_placeholder') { // local user
                                updateLocalAudioVisualizer(item.volume);
                            } else if (remoteUsers.has(item.userId)) { // remote user
                                updateRemoteAudioVisualizer(item.userId, item.volume);
                            }
                        });
                    });
                };

                // --- Audio Visualization (Simplified using volume levels) ---
                let localVisualizerCtx = null;
                const setupLocalAudioVisualizer = () => {
                    const canvas = document.getElementById('localAudioVisualizer');
                    if (canvas) localVisualizerCtx = canvas.getContext('2d');
                    if (rtcEngine.value) {
                        // Enable volume indication. Interval is in ms.
                        // Check SDK docs for specific API, might be enableAudioVolumeIndication or part of engine config.
                        rtcEngine.value.enableAudioVolumeIndication({ interval: 200, enable_vad: false });
                    }
                };
                const updateLocalAudioVisualizer = (volume) => { // volume is 0-255
                    if (!localVisualizerCtx) return;
                    const canvas = localVisualizerCtx.canvas;
                    const barWidth = (volume / 255) * canvas.width;
                    localVisualizerCtx.fillStyle = '#e5e7eb';
                    localVisualizerCtx.fillRect(0, 0, canvas.width, canvas.height);
                    localVisualizerCtx.fillStyle = '#3b82f6'; // blue-500
                    localVisualizerCtx.fillRect(0, 0, barWidth, canvas.height);
                };
                const startLocalAudioVisualization = () => {
                    if (!localVisualizerCtx) setupLocalAudioVisualizer();
                };
                const stopLocalAudioVisualization = () => {
                     if (localVisualizerCtx) {
                        const canvas = localVisualizerCtx.canvas;
                        localVisualizerCtx.fillStyle = '#e5e7eb';
                        localVisualizerCtx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                };
                const updateRemoteAudioVisualizer = (uid, volume) => {
                    const container = document.getElementById(`remote-audio-${uid}`);
                    if (container) {
                        // Simple text update, or you can draw on a canvas per remote user
                        let p = container.querySelector('p.volume-level');
                        if (!p) {
                            p = document.createElement('p');
                            p.className = 'text-xs volume-level';
                            container.appendChild(p);
                        }
                        p.textContent = `音量: ${volume}`;
                        // For a bar visual:
                        let bar = container.querySelector('.volume-bar');
                        if (!bar) {
                            bar = document.createElement('div');
                            bar.className = 'volume-bar h-2 bg-green-500 rounded mt-1';
                            bar.style.transition = 'width 0.1s';
                            container.appendChild(bar);
                        }
                        bar.style.width = `${(volume / 255) * 100}%`;

                    }
                };


                // --- Lifecycle Hooks ---
                onBeforeUnmount(async () => {
                    if (rtcEngine.value) {
                        if (isInRoom.value) {
                            await leaveRoomHandler();
                        }
                        VERTC.destroyEngine(rtcEngine.value);
                        rtcEngine.value = null;
                        console.log("RTC Engine destroyed");
                    }
                });
                
                // Persist basic config
                watch(appId, (newVal) => localStorage.setItem('volcAppId', newVal));
                watch(userId, (newVal) => localStorage.setItem('volcUserId', newVal));
                watch(roomId, (newVal) => localStorage.setItem('volcRoomId', newVal));
                watch(tokenServerUrl, (newVal) => localStorage.setItem('volcTokenServerUrl', newVal));


                // Computed properties for UI
                const localAudioStatus = computed(() => {
                    if (isPublishingAudio.value) return '开启中...';
                    return isAudioPublished.value ? '已开启' : '已关闭';
                });
                const localAudioStatusDotClass = computed(() => {
                    if (isPublishingAudio.value) return 'status-pending';
                    return isAudioPublished.value ? 'status-processing' : 'status-disconnected';
                });


                return {
                    appId, userId, roomId, tokenServerUrl,
                    rtcEngine, isInRoom, currentRoomIdDisplay, isAudioPublished, isPublishingAudio,
                    remoteUsers,
                    infoMessage, errorMessage,
                    joinRoomHandler, leaveRoomHandler,
                    publishAudioHandler, unpublishAudioHandler,
                    localAudioStatus, localAudioStatusDotClass,
                    sdkNoiseReductionEnabled, toggleSdkNoiseReduction
                };
            }
        };

</script>
