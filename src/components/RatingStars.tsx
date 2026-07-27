import { useState } from 'react'

interface RatingStarsProps {
  rating: number
  onChange?: (newRating: number) => void
  readonly?: boolean
}

export default function RatingStars({ rating, onChange, readonly = false }: RatingStarsProps) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = hovered > 0 ? star <= hovered : star <= rating
        const isInteractive = !readonly && onChange

        return (
          <button
            key={star}
            type="button"
            disabled={!isInteractive}
            onMouseEnter={() => isInteractive && setHovered(star)}
            onMouseLeave={() => isInteractive && setHovered(0)}
            onClick={() => isInteractive && onChange(star)}
            className={`${
              isInteractive ? 'cursor-pointer' : 'cursor-default'
            } transition-colors duration-100 focus:outline-none`}
          >
            <svg
              className={`w-5 h-5 ${
                filled ? 'text-amber-400' : 'text-gray-300'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}