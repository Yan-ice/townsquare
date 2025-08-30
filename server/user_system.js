// flaskClient.js
const axios = require('axios');
const crypto = require('crypto');

class FlaskClient {
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
        name: token.replace("guest_", ""),
        is_storyteller: false,
        is_guest: true,
      }
    }
    try {
      const res = await axios.post(
        `${this.baseURL}/user/view_user/${token}`,
        {}, // POST body 可为空
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
        }
      );

      if (res.data.status !== 'success') {
        return {
            token: token,
            name: res.data.name,
            is_storyteller: res.data.permission_storyteller,
            is_guest: false,
        }
      }

      return res.data;
    } catch (err) {
      throw new Error(`Get user failed: ${err.message}`);
    }
  }
}

module.exports = FlaskClient;
