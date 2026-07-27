/**
 * 用户认证路由
 *
 * POST /api/auth/register — 注册
 * POST /api/auth/login    — 登录
 * GET  /api/auth/me       — 获取当前用户信息（需认证）
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const { queryAll } = require('../database/connection');

const router = express.Router();

// ============================================================
// POST /api/auth/register — 注册
// ============================================================
router.post('/register', async (req, res) => {
  try {
    const { getDb, saveDb } = require('../database/connection');
    const db = await getDb();

    const { username, password } = req.body;

    // 参数校验
    if (!username || !username.trim()) {
      return res.status(400).json({ code: 400, data: null, message: '请输入用户名' });
    }
    if (!password) {
      return res.status(400).json({ code: 400, data: null, message: '请输入密码' });
    }
    if (password.length < 6) {
      return res.status(400).json({ code: 400, data: null, message: '密码至少6位' });
    }

    const trimmedUsername = username.trim();

    // 检查用户名是否已存在
    const existing = queryAll(db, 'SELECT id FROM users WHERE username = ?', [trimmedUsername]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(409).json({ code: 409, data: null, message: '用户名已存在' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 插入用户（参数化查询）
    db.run(
      'INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)',
      [trimmedUsername, hashedPassword, trimmedUsername]
    );
    saveDb();

    // 获取刚插入的用户
    const result = queryAll(db, 'SELECT id, username, nickname FROM users WHERE username = ?', [trimmedUsername]);
    const user = result[0]?.values[0];

    // 生成 token
    const token = jwt.sign(
      { id: user[0], username: user[1] },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      code: 201,
      data: {
        token,
        user: {
          id: user[0],
          username: user[1],
          nickname: user[2],
        },
      },
      message: '注册成功',
    });
  } catch (err) {
    console.error('[注册错误]', err);
    res.status(500).json({ code: 500, data: null, message: '服务器错误' });
  }
});

// ============================================================
// POST /api/auth/login — 登录
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const { getDb } = require('../database/connection');
    const db = await getDb();

    const { username, password } = req.body;

    // 参数校验
    if (!username || !username.trim()) {
      return res.status(400).json({ code: 400, data: null, message: '请输入用户名' });
    }
    if (!password) {
      return res.status(400).json({ code: 400, data: null, message: '请输入密码' });
    }

    // 查询用户（参数化查询）
    const result = queryAll(db, 'SELECT id, username, password, nickname FROM users WHERE username = ?', [username.trim()]);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ code: 401, data: null, message: '用户名或密码错误' });
    }

    const user = result[0].values[0];
    const userId = user[0];
    const dbUsername = user[1];
    const hashedPassword = user[2];
    const nickname = user[3];

    // 验证密码
    const isMatch = await bcrypt.compare(password, hashedPassword);
    if (!isMatch) {
      return res.status(401).json({ code: 401, data: null, message: '用户名或密码错误' });
    }

    // 生成 token
    const token = jwt.sign(
      { id: userId, username: dbUsername },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      code: 200,
      data: {
        token,
        user: {
          id: userId,
          username: dbUsername,
          nickname: nickname || dbUsername,
        },
      },
      message: '登录成功',
    });
  } catch (err) {
    console.error('[登录错误]', err);
    res.status(500).json({ code: 500, data: null, message: '服务器错误' });
  }
});

// ============================================================
// GET /api/auth/me — 获取当前用户信息（需认证）
// ============================================================
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { getDb } = require('../database/connection');
    const db = await getDb();

    const result = queryAll(db,
      'SELECT id, username, nickname, avatar, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ code: 404, data: null, message: '用户不存在' });
    }

    const user = result[0].values[0];
    res.json({
      code: 200,
      data: {
        id: user[0],
        username: user[1],
        nickname: user[2],
        avatar: user[3],
        created_at: user[4],
      },
      message: 'success',
    });
  } catch (err) {
    console.error('[获取用户信息错误]', err);
    res.status(500).json({ code: 500, data: null, message: '服务器错误' });
  }
});

module.exports = router;