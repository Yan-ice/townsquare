const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('./mydatabase.db')

const TOKEN_SHIFT = 100000

function db_init() {
    // 创建表
    db.run(`CREATE TABLE IF NOT EXISTS users (
      token INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )`);
}

function user_login(username, password, callback) {
    db_init();
    user_register(username, password);
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
          console.error('数据库查询失败:', err);
          callback(0);
          return
        }
    
        if (!row) {
          console.log('用户',username,'不存在，忽略');
          callback(0);
          return
        }
    
        if (row.password == password) {
          console.log('密码匹配，返回 token');
          callback(TOKEN_SHIFT + row.token + "")
        } else {
          console.log('密码不匹配');
          callback(0);
        }
    })
}

function user_register(usrname, pwd) {
    db_init();
    db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, [usrname, pwd]);
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