const { getDb, saveDb, closeDb } = require('./connection');
const bcrypt = require('bcryptjs');

/**
 * 初始化数据库：创建所有表并插入初始数据
 */
async function initDatabase() {
  const db = await getDb();

  console.log('[数据库] 开始初始化...');

  // ============================================================
  // 1. 用户表
  // ============================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  console.log('[数据库] 用户表 OK');

  // 检查是否已有用户数据，没有则插入默认管理用户
  const userCount = db.exec("SELECT COUNT(*) as count FROM users");
  if (userCount.length === 0 || userCount[0].values[0][0] === 0) {
    const hashedPassword = bcrypt.hashSync('123456', 10);
    db.run(
      `INSERT INTO users (username, password, nickname) VALUES ('admin', '${hashedPassword}', '管理员')`
    );
    console.log('[数据库] 默认管理用户 OK (admin/123456)');
  }

  // ============================================================
  // 2. 课表表
  // ============================================================
  // 先尝试添加新列（兼容已有数据库的情况）
  try {
    db.run("ALTER TABLE courses ADD COLUMN reminder_enabled INTEGER DEFAULT 1");
  } catch (e) { /* 列已存在则忽略 */ }
  try {
    db.run("ALTER TABLE courses ADD COLUMN reminder_minutes INTEGER DEFAULT 15");
  } catch (e) { /* 列已存在则忽略 */ }
  try {
    db.run("ALTER TABLE courses ADD COLUMN weeks TEXT DEFAULT '[]'");
  } catch (e) { /* 列已存在则忽略 */ }
  try {
    db.run("ALTER TABLE courses ADD COLUMN color TEXT DEFAULT ''");
  } catch (e) { /* 列已存在则忽略 */ }

  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_name TEXT NOT NULL,
      teacher TEXT,
      classroom TEXT,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 7),
      start_time TEXT,
      end_time TEXT,
      semester TEXT,
      reminder_enabled INTEGER DEFAULT 1,
      reminder_minutes INTEGER DEFAULT 15,
      weeks TEXT DEFAULT '[]',
      color TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('[数据库] 课表表 OK');

  // ============================================================
  // 3. 食堂表
  // ============================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS canteens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      rating REAL DEFAULT 0,
      tags TEXT DEFAULT '[]',
      image TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  console.log('[数据库] 食堂表 OK');

  // ============================================================
  // 4. 评价表
  // ============================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      canteen_id INTEGER NOT NULL,
      rating REAL NOT NULL DEFAULT 0,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (canteen_id) REFERENCES canteens(id)
    )
  `);
  console.log('[数据库] 评价表 OK');

  // ============================================================
  // 5. 二手物品表
  // ============================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT,
      description TEXT DEFAULT '',
      contact TEXT,
      images TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('[数据库] 二手物品表 OK');

  // ============================================================
  // 6. 失物招领表
  // ============================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS lost_found (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT NOT NULL CHECK(type IN ('丢失', '捡到')),
      title TEXT NOT NULL,
      location TEXT,
      date TEXT,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('[数据库] 失物招领表 OK');

  // ============================================================
  // 插入初始数据
  // ============================================================

  // 检查是否已有食堂数据
  const canteenCount = db.exec("SELECT COUNT(*) as count FROM canteens");
  if (canteenCount.length === 0 || canteenCount[0].values[0][0] === 0) {
    db.run(`INSERT INTO canteens (id, name, location, rating, tags) VALUES
      (1, '第一食堂', '东校区', 4.2, '["自选","快餐"]'),
      (2, '第二食堂', '西校区', 4.0, '["面食","小炒"]'),
      (3, '第三食堂', '北校区', 3.8, '["麻辣烫","盖饭"]'),
      (4, '教工食堂', '中心区', 4.5, '["自助","点菜"]')
    `);
    console.log('[数据库] 食堂初始数据 OK');
  }

  // 检查是否已有二手物品数据
  const itemCount = db.exec("SELECT COUNT(*) as count FROM items");
  if (itemCount.length === 0 || itemCount[0].values[0][0] === 0) {
    db.run(`INSERT INTO items (id, title, price, category, description, contact, status) VALUES
      (1, '高等数学（第七版）', 25, '教材', '教材', '微信: example1', 'active'),
      (2, '机械键盘 Cherry MX', 150, '电子', '机械键盘', '微信: example2', 'active'),
      (3, '台灯 LED 护眼', 45, '生活', '护眼台灯', '微信: example3', 'active'),
      (4, 'Python编程从入门到实践', 30, '教材', '编程教材', '微信: example4', 'active'),
      (5, '蓝牙耳机 AirPods', 200, '电子', '蓝牙耳机', '微信: example5', 'active'),
      (6, '床上小桌板', 35, '生活', '小桌板', '微信: example6', 'active')
    `);
    console.log('[数据库] 二手物品初始数据 OK');
  }

  // 检查是否已有失物招领数据
  const lfCount = db.exec("SELECT COUNT(*) as count FROM lost_found");
  if (lfCount.length === 0 || lfCount[0].values[0][0] === 0) {
    db.run(`INSERT INTO lost_found (id, type, title, location, date, description) VALUES
      (1, '丢失', '黑色钱包', '图书馆', '2025-01-10', '内有学生证和现金'),
      (2, '捡到', 'U盘 金士顿32G', '教学楼A301', '2025-01-11', '蓝色外壳'),
      (3, '丢失', '校园卡', '食堂二楼', '2025-01-12', '学号2024开头'),
      (4, '捡到', '雨伞 黑色折叠', '图书馆门口', '2025-01-12', '')
    `);
    console.log('[数据库] 失物招领初始数据 OK');
  }

  // 检查是否已有评价数据
  const reviewCount = db.exec("SELECT COUNT(*) as count FROM reviews");
  if (reviewCount.length === 0 || reviewCount[0].values[0][0] === 0) {
    db.run(`INSERT INTO reviews (id, canteen_id, rating, content, created_at) VALUES
      (1, 1, 4.5, '红烧肉做得不错，肥而不腻，价格实惠！', '2025-03-10'),
      (2, 1, 4.0, '面食窗口的拉面很劲道，推荐牛肉拉面。', '2025-03-12'),
      (3, 2, 5.0, '麻辣烫真的很正宗，辣椒够味！每次去都排队。', '2025-03-08'),
      (4, 2, 4.5, '新开的奶茶店不错，推荐芋泥波波奶茶。', '2025-03-15'),
      (5, 2, 3.0, '铁板烧窗口量有点少，男生吃不太饱。', '2025-03-18'),
      (6, 3, 3.5, '自助餐品种挺多的，但味道一般，胜在便宜。', '2025-03-05'),
      (7, 3, 4.0, '砂锅豆腐超级好吃，冬天来一份暖暖的。', '2025-03-20'),
      (8, 4, 4.0, '教工食堂的小碗菜很适合一个人吃，味道不错。', '2025-03-14'),
      (9, 4, 4.5, '炖汤真材实料，排骨玉米汤很好喝。', '2025-03-22')
    `);
    console.log('[数据库] 评价初始数据 OK');
  }

  // ============================================================
  // 7. 课表初始数据（汉语国际教育专业课表）
  // ============================================================
  // 检查是否已有课表数据
  const courseCount = db.exec("SELECT COUNT(*) as count FROM courses");
  if (courseCount.length === 0 || courseCount[0].values[0][0] === 0) {
    // 颜色数组用于在课表上区分不同课程
    const defaultWeeks = JSON.stringify([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);
    db.run(`INSERT INTO courses (user_id, course_name, teacher, classroom, day_of_week, start_time, end_time, semester, reminder_enabled, reminder_minutes, weeks, color) VALUES
      (1, '现代汉语', '张教授', '教学楼A201', 1, '08:00', '09:40', '2025-2026-2', 1, 15, '${defaultWeeks}', '#4F46E5'),
      (1, '大学英语', '李老师', '教学楼B302', 1, '10:00', '11:40', '2025-2026-2', 1, 15, '${defaultWeeks}', '#059669'),
      (1, '对外汉语教学法', '孙老师', '教学楼B201', 1, '14:00', '15:40', '2025-2026-2', 1, 15, '${defaultWeeks}', '#D97706'),
      (1, '古代文学', '王教授', '教学楼A103', 2, '08:00', '09:40', '2025-2026-2', 1, 15, '${defaultWeeks}', '#DC2626'),
      (1, '中国文化概论', '刘教授', '教学楼A103', 2, '10:00', '11:40', '2025-2026-2', 1, 15, '${defaultWeeks}', '#7C3AED'),
      (1, '语言学概论', '赵教授', '教学楼A301', 3, '08:00', '09:40', '2025-2026-2', 1, 15, '${defaultWeeks}', '#0891B2'),
      (1, '现当代文学', '陈教授', '教学楼A201', 3, '14:00', '15:40', '2025-2026-2', 1, 15, '${defaultWeeks}', '#E11D48'),
      (1, '书法与篆刻', '周老师', '艺术楼201', 4, '08:00', '09:40', '2025-2026-2', 1, 15, '${defaultWeeks}', '#65A30D'),
      (1, '大学英语', '李老师', '教学楼B302', 4, '10:00', '11:40', '2025-2026-2', 1, 15, '${defaultWeeks}', '#059669'),
      (1, '现代汉语', '张教授', '教学楼A201', 4, '14:00', '15:40', '2025-2026-2', 1, 15, '${defaultWeeks}', '#4F46E5'),
      (1, '古代文学', '王教授', '教学楼A103', 5, '08:00', '09:40', '2025-2026-2', 1, 15, '${defaultWeeks}', '#DC2626'),
      (1, '现当代文学', '陈教授', '教学楼A201', 5, '10:00', '11:40', '2025-2026-2', 1, 15, '${defaultWeeks}', '#E11D48')
    `);
    console.log('[数据库] 课表初始数据 OK（汉语国际教育专业课表）');
  }

  // 持久化到磁盘
  saveDb();
  console.log('[数据库] 初始化完成，数据已保存');
}

// 如果直接运行此文件，执行初始化
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('[数据库] 初始化成功');
      closeDb();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[数据库] 初始化失败:', err);
      closeDb();
      process.exit(1);
    });
}

module.exports = initDatabase;