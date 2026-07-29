import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { API, apiRequest } from '../api'

// ============================================================
// AuthGuard — 路由守卫组件
//
// 包裹需要登录才能访问的页面，未登录时自动跳转到 /auth，
// 并在 URL 中携带回跳地址（?redirect=/xxx），
// 登录成功后自动跳转回来源页面。
//
// 组件会验证 localStorage 中的 token 是否存在且有效，
// 如果 token 无效（过期/被篡改），自动清除并跳转到登录页。
// ============================================================

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [verified, setVerified] = useState<'loading' | 'ok' | 'fail'>('loading')

  const redirectToLogin = () => {
    const redirect = encodeURIComponent(location.pathname + location.search)
    navigate(`/auth?redirect=${redirect}`, { replace: true })
  }

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      redirectToLogin()
      return
    }

    // 验证 token 有效性：调用 /api/auth/me
    apiRequest<{ id: number; username: string; nickname: string }>(API.auth.me, 'GET')
      .then((res) => {
        // token 有效，同步更新 localStorage 中的用户信息
        const userData = {
          id: res.data.id,
          username: res.data.username,
          nickname: res.data.nickname || res.data.username,
        }
        localStorage.setItem('user', JSON.stringify(userData))
        setVerified('ok')
      })
      .catch(() => {
        // token 无效或过期，清除本地数据并跳转到登录页
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.dispatchEvent(new Event('auth-change'))
        setVerified('fail')
        redirectToLogin()
      })
  }, [navigate, location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // 加载中 — 不渲染任何内容
  if (verified === 'loading') {
    return null
  }

  // 验证失败 — 跳转中，不渲染内容
  if (verified === 'fail') {
    return null
  }

  // 验证通过 — 渲染子组件
  return <>{children}</>
}