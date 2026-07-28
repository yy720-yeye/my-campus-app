// 加载 .env 环境变量（必须在最前面）
// 先加载项目根目录 .env，再加载 server/.env（后者覆盖同名变量）
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const fs = require('fs');
const { execSync } = require('child_process');
const cors = require('cors');
const initDatabase = require('./database/init');
const { getDb, saveDb, closeDb, queryAll } = require('./database/connection');
const { authMiddleware } = require('./middleware/auth');

// ---------- 自动构建前端 ----------
// 如果 dist 目录不存在或缺少 index.html，则自动执行前端构建
const distPath = path.join(__dirname, '..', 'dist');
const distIndexPath = path.join(distPath, 'index.html');
if (!fs.existsSync(distPath) || !fs.existsSync(distIndexPath)) {
  console.log('检测到前端未构建，正在自动构建...');
  try {
    execSync('npm run build', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
    });
    console.log('前端构建完成');
  } catch (err) {
    console.error('前端自动构建失败:', err.message);
    process.exit(1);
  }
}

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
app.use('/api/schedules', require('./routes/schedules'));

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
// 使用 app.use 而非 app.get('*', ...) 以兼容 Express 5 的路由语法
app.use((req, res) => {
  // 跳过 API 路径，避免干扰 API 错误处理
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ code: 404, data: null, message: '接口不存在' });
  }
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'), (err) => {
    if (err) {
      res.status(500).send('前端资源未构建，请运行 npm run build');
    }
  });
});

// ---------- 启动服务器 ----------
const PORT = process.env.PORT || 3001;

// 将数据库实例挂载到 app 上，方便路由文件通过 req.app.get('db') 获取
app.set('db', {
  getDb,
  saveDb,
  closeDb,
  queryAll,
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