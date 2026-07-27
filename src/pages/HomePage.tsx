import FeatureCard from '../components/FeatureCard'

export default function HomePage() {
  return (
    <section className="relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-200 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative">
        {/* 标题区域 */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-blue-700 via-cyan-500 to-purple-500 bg-clip-text text-transparent">
              校园生活服务平台
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-blue-400 font-medium">
            让校园生活更便捷
          </p>
          <p className="mt-4 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            一站式校园生活助手，查课表、评食堂、淘二手、找失物，让校园生活更便捷
          </p>

          {/* 操作按钮 */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 hover:from-blue-700 hover:to-cyan-600 transition-all duration-300"
            >
              立即体验
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300"
            >
              了解更多
            </a>
          </div>
        </div>

        {/* 功能卡片 2x2 */}
        <div id="features" className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <FeatureCard
            title="课表管理"
            description="查看和管理你的课程表"
            icon="📅"
            link="/schedule"
            accentColor="blue"
          />
          <FeatureCard
            title="食堂点评"
            description="查看食堂菜单和评价"
            icon="🍽️"
            link="/canteen"
            accentColor="orange"
          />
          <FeatureCard
            title="二手交易"
            description="买卖闲置物品"
            icon="🔄"
            link="/trade"
            accentColor="green"
          />
          <FeatureCard
            title="失物招领"
            description="发布和查找失物"
            icon="🔍"
            link="/lost-found"
            accentColor="purple"
          />
        </div>
      </div>
    </section>
  )
}