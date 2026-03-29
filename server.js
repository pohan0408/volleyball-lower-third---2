const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
const path = require('path');

// 讓 public 資料夾裡的東西可以直接在網頁上讀取
app.use(express.static(path.join(__dirname, 'public')));

// 👑 導播專屬密碼在這裡設定
const ADMIN_PASSWORD = "dalp"; 

io.on('connection', (socket) => {
  console.log('有裝置連線了');

  // 1. 一般比分更新 (計分員權限)
  socket.on('update-data', (data) => {
    io.emit('data-updated', data);
  });

  // 2. 導播專屬：切換頁籤時的密碼驗證
  socket.on('verify-password', (pwd, callback) => {
    if (pwd === ADMIN_PASSWORD) {
      callback(true); // 密碼對了
    } else {
      callback(false); // 密碼錯了
    }
  });

  // 3. 導播專屬：強制更新版面座標
  socket.on('update-position', (data) => {
    if (data.password === ADMIN_PASSWORD) {
      io.emit('position-updated', data.positions);
      socket.emit('auth-result', { success: true, msg: '✅ 導播好！位置已更新。' });
      console.log('版面位置已更新');
    } else {
      socket.emit('auth-result', { success: false, msg: '❌ 密碼錯誤，你沒有權限動這個喔！' });
    }
  });

  // 4. 進出場控制
  socket.on('control-overlay', (command) => {
    io.emit('overlay-command', command);
  });
});

// 1. 計分卡 進場/退場
app.get('/api/score/show', (req, res) => {
    io.emit('overlay-command', 'show');
    res.send('計分板進場指令已送出！');
});
app.get('/api/score/hide', (req, res) => {
    io.emit('overlay-command', 'hide');
    res.send('計分板退場指令已送出！');
});

// 2. 加減分、局數、球權實體按鍵遙控器
app.get('/api/control/:team/:action', (req, res) => {
    const command = {
        team: req.params.team,  // 接收 'A' 或 'B'
        action: req.params.action // 接收 'add-score', 'sub-score' 等動作
    };
    // 廣播給背景開著的 dashboard.html，叫它幫忙按按鈕
    io.emit('streamdeck-command', command);
    res.send(`Stream Deck 指令已送出：隊伍 ${command.team} 執行 ${command.action}`);
});
// ==========================================
const PORT = 3000;
http.listen(PORT, () => {
  console.log(`伺服器啟動！請在瀏覽器或 OBS 輸入網址使用。`);
});