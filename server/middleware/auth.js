/**
 * JWT 认证中间件
 *
 * 验证请求头中的 Bearer token，
 * 认证通过后将用户信息挂载到 req.user
 */

const jwt = require('jsonwebtoken');

// JWT 密钥（优先使用环境变量，开发环境兜底）
const JWT_SECRET = process.env.JWT_SECRET || 'campus-app-secret-key-2026';

/**
 * 认证中间件
 * 在需要登录才能访问的路由上使用
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      code: 401,
      data: null,
      message: '未登录，请先登录',
    });
  }

  // 期望格式: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      code: 401,
      data: null,
      message: 'Token 格式错误',
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username }
    next();
  } catch (err) {
    return res.status(401).json({
      code: 401,
      data: null,
      message: 'Token 无效或已过期',
    });
  }
}

module.exports = { authMiddleware, JWT_SECRET };