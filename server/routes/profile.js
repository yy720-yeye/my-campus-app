/**
 * 个人中心路由
 *
 * GET    /api/profile            — 获取当前用户完整信息（含统计）
 * PUT    /api/profile            — 更新个人信息（昵称）
 * GET    /api/profile/items      — 获取用户发布的二手商品
 * GET    /api/profile/lost-found — 获取用户发布的失物招领
 * DELETE /api/profile/account    — 注销账号
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { saveDb, queryAll } = require('../database/connection');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有接口均需登录
router.use(authMiddleware);

// ============================================================
// GET / —— 获取用户完整信息（含统计）
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const userId = req.user.id;

    // 1. 基本信息
    const userResult = queryAll(
      db,
      'SELECT id, username, nickname, avatar, created_at FROM users WHERE id = ?',
      [userId]
    );
    if (!userResult[0]?.values?.length) {
      return res.status(404).json({ code: 404, data: null, message: '用户不存在' });
    }
    const row = userResult[0].values[0];

    // 2. 统计信息
    const itemCount = queryAll(db, 'SELECT COUNT(*) as cnt FROM items WHERE user_id = ? AND status = ?', [userId, 'active']);
    const activeItemCount = itemCount[0]?.values[0][0] || 0;

    const soldCount = queryAll(db, 'SELECT COUNT(*) as cnt FROM items WHERE user_id = ? AND status = ?', [userId, 'sold']);
    const soldItemCount = soldCount[0]?.values[0][0] || 0;

    const lostCount = queryAll(db, "SELECT COUNT(*) as cnt FROM lost_found WHERE user_id = ? AND type = '丢失'", [userId]);
    const lostFoundCount = lostCount[0]?.values[0][0] || 0;

    const foundCount = queryAll(db, "SELECT COUNT(*) as cnt FROM lost_found WHERE user_id = ? AND type = '捡到'", [userId]);
    const foundItemCount = foundCount[0]?.values[0][0] || 0;

    const reviewCount = queryAll(db, 'SELECT COUNT(*) as cnt FROM reviews WHERE user_id = ?', [userId]);
    const totalReviews = reviewCount[0]?.values[0][0] || 0;

    res.json({
      code: 200,
      data: {
        id: row[0],
        username: row[1],
        nickname: row[2] || row[1],
        avatar: row[3],
        created_at: row[4],
        stats: {
          activeItems: activeItemCount,
          soldItems: soldItemCount,
          lostPosts: lostFoundCount,
          foundPosts: foundItemCount,
          reviews: totalReviews,
        },
      },
      message: 'success',
    });
  } catch (err) {
    console.error('[个人中心] 获取信息失败:', err.message);
    res.status(500).json({ code: 500, data: null, message: '服务器错误' });
  }
});

// ============================================================
// PUT / —— 更新个人信息（昵称）
// ============================================================
router.put('/', async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const userId = req.user.id;
    const { nickname } = req.body;

    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      return res.status(400).json({ code: 400, data: null, message: '昵称不能为空' });
    }
    const trimmed = nickname.trim();
    if (trimmed.length > 20) {
      return res.status(400).json({ code: 400, data: null, message: '昵称不超过 20 字' });
    }

    db.run('UPDATE users SET nickname = ? WHERE id = ?', [trimmed, userId]);
    saveDb();

    res.json({
      code: 200,
      data: { nickname: trimmed },
      message: '更新成功',
    });
  } catch (err) {
    console.error('[个人中心] 更新信息失败:', err.message);
    res.status(500).json({ code: 500, data: null, message: '服务器错误' });
  }
});

// ============================================================
// GET /items —— 获取用户发布的二手商品
// ============================================================
router.get('/items', async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const userId = req.user.id;
    const status = req.query.status || ''; // 可选筛选：active / sold

    let sql = `
      SELECT id, user_id, title, price, category, description, contact, images, status, created_at
      FROM items
      WHERE user_id = ?
    `;
    const params = [userId];

    if (status && ['active', 'sold'].includes(status)) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC, id DESC';

    const result = queryAll(db, sql, params);
    const rows = result[0]?.values || [];
    const items = rows.map((row) => ({
      id: row[0],
      user_id: row[1],
      title: row[2],
      price: row[3],
      category: row[4],
      description: row[5] || '',
      contact: row[6] || '',
      images: row[7] ? JSON.parse(row[7]) : [],
      status: row[8],
      created_at: row[9],
    }));

    res.json({ code: 200, data: { items }, message: 'success' });
  } catch (err) {
    console.error('[个人中心] 获取商品列表失败:', err.message);
    res.status(500).json({ code: 500, data: null, message: '服务器错误' });
  }
});

// ============================================================
// GET /lost-found —— 获取用户发布的失物招领
// ============================================================
router.get('/lost-found', async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const userId = req.user.id;

    const result = queryAll(
      db,
      `SELECT id, user_id, type, title, location, date, description, status, created_at
       FROM lost_found
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [userId]
    );

    const rows = result[0]?.values || [];
    const items = rows.map((row) => ({
      id: row[0],
      user_id: row[1],
      type: row[2],
      title: row[3],
      location: row[4] || '',
      date: row[5] || '',
      description: row[6] || '',
      status: row[7],
      created_at: row[8],
    }));

    res.json({ code: 200, data: { items }, message: 'success' });
  } catch (err) {
    console.error('[个人中心] 获取失物招领列表失败:', err.message);
    res.status(500).json({ code: 500, data: null, message: '服务器错误' });
  }
});

// ============================================================
// DELETE /account —— 注销账号
// ============================================================
router.delete('/account', async (req, res) => {
  try {
    const { getDb } = req.app.get('db');
    const db = await getDb();
    const userId = req.user.id;

    // 检查用户是否还有进行中的二手商品
    const activeItems = queryAll(
      db,
      'SELECT COUNT(*) as cnt FROM items WHERE user_id = ? AND status = ?',
      [userId, 'active']
    );
    if (activeItems[0]?.values[0][0] > 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '还有进行中的二手商品，请先下架所有商品后再注销',
      });
    }

    // 删除与该用户相关的所有数据
    db.run('DELETE FROM reviews WHERE user_id = ?', [userId]);
    db.run('DELETE FROM items WHERE user_id = ?', [userId]);
    db.run('DELETE FROM lost_found WHERE user_id = ?', [userId]);
    db.run('DELETE FROM courses WHERE user_id = ?', [userId]);
    db.run('DELETE FROM users WHERE id = ?', [userId]);
    saveDb();

    console.log(`[个人中心] 用户 #${userId} 已注销账号`);

    res.json({ code: 200, data: null, message: '账号已注销' });
  } catch (err) {
    console.error('[个人中心] 注销账号失败:', err.message);
    res.status(500).json({ code: 500, data: null, message: '服务器错误' });
  }
});

module.exports = router;