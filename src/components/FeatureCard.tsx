import { Link } from 'react-router-dom'

interface FeatureCardProps {
  title: string
  description: string
  icon: string
  link: string
  accentColor?: 'blue' | 'orange' | 'green' | 'purple'
}

const colorMap: Record<string, { bg: string; ring: string }> = {
  blue:   { bg: 'bg-blue-100',  ring: 'ring-blue-200' },
  orange: { bg: 'bg-orange-100', ring: 'ring-orange-200' },
  green:  { bg: 'bg-green-100', ring: 'ring-green-200' },
  purple: { bg: 'bg-purple-100', ring: 'ring-purple-200' },
}

export default function FeatureCard({ title, description, icon, link, accentColor }: FeatureCardProps) {
  const colors = accentColor ? colorMap[accentColor] : null

  return (
    <Link
      to={link}
      className="block bg-white rounded-xl p-6 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-[fadeIn_0.5s_ease-out]"
    >
      <div className="flex justify-center mb-4">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ring-2 ${
            colors ? `${colors.bg} ${colors.ring}` : 'bg-gray-100 ring-gray-200'
          }`}
        >
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-bold text-gray-800 text-center mb-2">{title}</h3>
      <p className="text-sm text-gray-500 text-center leading-relaxed">{description}</p>
    </Link>
  )
}