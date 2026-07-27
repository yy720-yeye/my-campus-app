import { useState, useRef } from 'react'
import RatingStars from './RatingStars'
import { API, apiRequest } from '../api'

// ============================================================
// Toast 提示组件
// ============================================================
interface ToastProps {
  message: string
  type: 'success' | 'error'
  visible: boolean
}

function Toast({ message, type, visible }: ToastProps) {
  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg text-white text-sm font-medium shadow-lg transition-all duration-300 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
      } ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {message}
      </div>
    </div>
  )
}

// ============================================================
// Props 类型
// ============================================================
interface ReviewFormProps {
  canteenId: number
  onSubmitSuccess?: () => void
}

const MAX_CONTENT_LENGTH = 200

// ============================================================
// 主组件
// ============================================================
export default function ReviewForm({ canteenId, onSubmitSuccess }: ReviewFormProps) {
  // ---------- 表单状态 ----------
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')

  // ---------- 验证状态 ----------
  const [errors, setErrors] = useState<{ rating: string; content: string }>({
    rating: '',
    content: '',
  })
  const [touched, setTouched] = useState<{ rating: boolean; content: boolean }>({
    rating: false,
    content: false,
  })

  // ---------- 提交状态 ----------
  const [submitting, setSubmitting] = useState(false)

  // ---------- Toast 状态 ----------
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  })

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type, visible: true })
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 3000)
  }

  // ---------- 验证 ----------
  const validateRating = (val: number): string => {
    if (val === 0) return '请给食堂打分'
    return ''
  }

  const validateContent = (val: string): string => {
    const trimmed = val.trim()
    if (!trimmed) return '请输入评价内容'
    if (trimmed.length < 5) return '评价至少5个字'
    if (trimmed.length > MAX_CONTENT_LENGTH) return `评价不超过${MAX_CONTENT_LENGTH}个字`
    return ''
  }

  const handleRatingChange = (val: number) => {
    setRating(val)
    if (touched.rating) {
      setErrors((prev) => ({ ...prev, rating: validateRating(val) }))
    }
  }

  const handleContentBlur = () => {
    setTouched((prev) => ({ ...prev, content: true }))
    setErrors((prev) => ({ ...prev, content: validateContent(content) }))
  }

  const validateAll = (): boolean => {
    const ratingErr = validateRating(rating)
    const contentErr = validateContent(content)
    setErrors({ rating: ratingErr, content: contentErr })
    setTouched({ rating: true, content: true })
    return !ratingErr && !contentErr
  }

  // ---------- 提交 ----------
  const handleSubmit = async () => {
    if (!validateAll()) {
      showToast('请填写完整信息', 'error')
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        canteen_id: canteenId,
        rating,
        content: content.trim(),
      }

      console.log('提交评价：', payload)

      await apiRequest(API.reviews, 'POST', payload)

      // 成功
      showToast('评价提交成功！', 'success')
      setRating(0)
      setContent('')
      setErrors({ rating: '', content: '' })
      setTouched({ rating: false, content: false })
      onSubmitSuccess?.()
    } catch {
      showToast('提交失败，请稍后重试', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------- 渲染 ----------
  const textareaClass = `w-full px-4 py-3 bg-white border text-sm rounded-lg placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow ${
    touched.content && errors.content ? 'border-red-400' : 'border-gray-200'
  }`

  return (
    <>
      {/* Toast */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* 头部 */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">写评价</h3>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* ---------- 评分 ---------- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              评分 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4 bg-amber-50/50 rounded-lg px-4 py-3 border border-amber-100">
              <RatingStars
                rating={rating}
                onChange={handleRatingChange}
              />
              <span
                className={`text-sm font-semibold ${
                  rating > 0 ? 'text-amber-500' : 'text-gray-400'
                }`}
              >
                {rating > 0 ? `${rating} 分` : '点击星星评分'}
              </span>
            </div>
            {touched.rating && errors.rating && (
              <p className="mt-1.5 text-xs text-red-500">{errors.rating}</p>
            )}
          </div>

          {/* ---------- 评价内容 ---------- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              评价内容 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={handleContentBlur}
                placeholder="说说你的用餐体验..."
                rows={4}
                maxLength={MAX_CONTENT_LENGTH}
                className={`${textareaClass} pr-16`}
              />
              <span className="absolute bottom-3 right-3 text-xs text-gray-400 select-none">
                {content.length}/{MAX_CONTENT_LENGTH}
              </span>
            </div>
            {touched.content && errors.content && (
              <p className="mt-1.5 text-xs text-red-500">{errors.content}</p>
            )}
          </div>

          {/* ---------- 提交按钮 ---------- */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg text-white transition-colors ${
                submitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {submitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  提交中...
                </>
              ) : (
                '提交评价'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}