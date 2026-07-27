const path = require('path');
const fs = require('fs');

// 数据库文件路径（优先使用环境变量，默认在 database 目录下）
const DB_PATH = process.env.CAMPUS_DB_PATH
  ? path.resolve(__dirname, '..', process.env.CAMPUS_DB_PATH)
  : path.join(__dirname, 'campus.db');

let db = null;

/**
 * 获取数据库连接（单例）
 * 首次调用时从文件加载，如果文件不存在则创建一个空数据库
 * @returns {Promise<import('sql.js').Database>}
 */
async function getDb() {
  if (db) return db;

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    // 从文件加载已有数据库
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('[数据库] 从文件加载数据库');
  } else {
    // 创建新的空数据库
    db = new SQL.Database();
    console.log('[数据库] 创建新的数据库');
  }

  return db;
}

/**
 * 将数据库保存到磁盘文件
 * 每次写入操作后应调用此方法持久化数据
 */
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * 安全的参数化查询（用于 SELECT 查询）
 * 使用 sql.js 的 prepare API 防止 SQL 注入
 *
 * @param {import('sql.js').Database} db - 数据库实例
 * @param {string} sql - SQL 语句，使用 ? 作为参数占位符
 * @param {any[]} params - 参数数组，按顺序对应 SQL 中的 ? 占位符
 * @returns {{ values: any[][] }[]} 与 db.exec() 兼容的返回格式
 *
 * @example
 * queryAll(db, 'SELECT * FROM users WHERE id = ?', [1])
 * // → [{ values: [[1, 'admin', ...]] }]
 */
function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.get());
  }
  stmt.free();
  return [{ values: rows }];
}

/**
 * 关闭数据库连接
 */
function closeDb() {
  if (db) {
    saveDb();
    db.close();
    db = null;
    console.log('[数据库] 连接已关闭');
  }
}

module.exports = { getDb, saveDb, queryAll, closeDb, DB_PATH };