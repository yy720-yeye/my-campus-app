// 加载 .env 环境变量（必须在最前面）
// 先加载项目根目录 .env，再加载 server/.env（后者覆盖同名变量）
require('dotenv').config();
require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const path = require('path');
const cors = require('cors');
const initDatabase = require('./database/init');
const { getDb, closeDb } = require('./database/connection');
const { authMiddleware } = require('./middleware/auth');

const app = express();

// ---------- 中间件 ----------
app.use(cors());                 // 允许跨域访问
app.use(express.json());         // 解析 JSON 请求体

// 日志中间件：打印每次请求的方法和 URL
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ---------- 静态文件服务 ----------
// 提供前端构建产物（dist 目录）的静态文件服务
app.use(express.static(path.join(__dirname, '..', 'dist')));

// ---------- 路由 ----------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/canteens', require('./routes/canteens'));
app.use('/api/items', require('./routes/items'));
app.use('/api/lost-found', require('./routes/lost-found'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/ai', require('./routes/ai'));

// ---------- 受保护测试路由：用于演示 401 ----------
// 访问 /api/protected 需要携带有效的 Bearer token
app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({
    code: 200,
    data: { user: req.user, message: '你已登录，可以访问受保护资源' },
    message: 'success',
  });
});

// ---------- SPA 回退路由 ----------
// 所有非 API 请求返回 index.html，支持前端路由（如 /canteen, /trade 等）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// ---------- 启动服务器 ----------
const PORT = process.env.PORT || 3001;

// 将数据库实例挂载到 app 上，方便路由文件通过 req.app.get('db') 获取
app.set('db', {
  getDb,
  closeDb,
});

// 初始化数据库后启动服务器
initDatabase()
  .then(() => {
    console.log('数据库初始化成功');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`后端服务器运行在 http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  });