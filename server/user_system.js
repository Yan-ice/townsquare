// flaskClient.js
const axios = require('axios');
const crypto = require('crypto');
const { constants } = require('fs/promises');

class FlaskClient {
  userInfos = [];

  constructor(baseURL = 'https://0.0.0.0:5000', secretKey = 'yanicesno1') {
    this.baseURL = baseURL;
    this.secretKey = secretKey;
  }
  async quickLogin(jsonFromMe) {
    if (!jsonFromMe || !jsonFromMe.signature) {
      console.log("Missing signature");
      throw new Error("Missing signature");
    }

    // 拿到签名并移除它
    const { signature, ...dataWithoutSig } = jsonFromMe;

    // 需要和 Flask 一样，按 key 排序并序列化
    const payload = JSON.stringify(
      dataWithoutSig,
      Object.keys(dataWithoutSig).sort()
    );
    console.log(payload);
    // 用 HMAC-SHA256 生成本地签名
    const expectedSig = crypto
      .createHmac("sha256", this.secretKey)
      .update(payload)
      .digest("hex");

    if (signature !== expectedSig) {
      console.log("Invalid signature");
      throw new Error("Invalid signature");
    }

    // 先移除同 id 的用户
    this.userInfos = this.userInfos.filter(user => user.id !== jsonFromMe.id);
    // 再插入新的用户对象
    this.userInfos.push(jsonFromMe);
    
    return String(jsonFromMe.id);
  }
  // 登录接口, return token
  async login(username, password) {
    if(password=="__guest__"){
      return  "guest_"+username;
    }
    try {
      const res = await axios.post(
        `${this.baseURL}/user/login_submit`,
        { username, password },
        { withCredentials: true } // 支持 Cookie
      );

      if (res.data.status !== 'success') {
        throw new Error(res.data.reason || 'Login failed');
      }

      // token 从返回 JSON 或 Cookie 中获取
      const token = res.data.id;
      if (!token) throw new Error('No token returned from Flask');

      return token;
    } catch (err) {
      throw new Error(`Login failed: ${err.message}`);
    }
  }

  // 查询用户信息
  async getUser(token) {
    if(token.startsWith("guest_")){
      return {
        token: token,
        username: token.replace("guest_", ""),
        is_storyteller: false,
        is_guest: true,
      }
    }
    const userInfo = this.userInfos.find(user => String(user.id) === token);
    if(!userInfo){
      throw new Error("User not found");
    }
    return {
      token: token,
      username: userInfo.username,
      is_storyteller: userInfo.permission_storyteller,
      is_guest: false,
    };
  }
}

module.exports = FlaskClient;
