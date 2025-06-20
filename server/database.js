const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('./user_data.db')

const TOKEN_SHIFT = 100000

function db_init() {
    // 创建表
    db.run(`CREATE TABLE IF NOT EXISTS users (
      token INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )`);
}

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'activation_codes.txt');

/**
 * 检查激活码是否存在，如果存在则删除并返回 true，否则返回 false
 * @param {string} codeToCheck - 用户输入的激活码
 * @returns {boolean}
 */
function verifyActivationCode(codeToCheck) {
  try {
    // 读取文件并按行分割
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const codes = fileContent.split('\n').map(line => line.trim()).filter(line => line);

    // 查找激活码
    const index = codes.indexOf(codeToCheck);
    if (index === -1) {
      return false; // 不存在
    }

    // 移除激活码并写回文件
    codes.splice(index, 1);
    fs.writeFileSync(filePath, codes.join('\n'), 'utf-8');

    return true;
  } catch (err) {
    console.error('激活码校验失败：', err);
    return false;
  }
}

function user_login(username, password, callback) {
  db_init();
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
    if (err) {
      console.error('数据库查询失败:', err);
      callback(0);
      return;
    }

    if (!row) {
      console.log('用户', username, '不存在，Trying register');
      user_register(username, password, (success) => {
        if (success) {
          // 注册完成后再次登录
          user_login(username, password, callback);
        } else {
          callback(0);
        }
      });
      return;
    }

    if (row.password === password) {
      console.log('密码匹配，返回 token');
      callback(TOKEN_SHIFT + row.token + "");
    } else {
      console.log('密码不匹配');
      callback(0);
    }
  });
}

function user_register(username, password, callback) {
  if (verifyActivationCode(password)) {
    db.run(
      `INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`,
      [username, password],
      function (err) {
        if (err) {
          console.error('注册失败:', err);
          callback(false);
        } else {
          callback(true);
        }
      }
    );
  } else {
    callback(false);
  }
}


function fetch_user_data(token, callback) {
    db_init();
    db.get(`SELECT * FROM users WHERE token = ?`, [token - TOKEN_SHIFT], (err, row) => {
        if (err) {
          console.error('数据库查询失败:', err)
          
          return
        }
    
        if (!row) {
          console.log('用户不存在，忽略')
          return
        }
        callback({
            token: TOKEN_SHIFT + row.token + "",
            username: row.username,
            password: row.password,
        })
      })
}

module.exports = {
    db_init,
    user_login,
    user_register,
    fetch_user_data
  }