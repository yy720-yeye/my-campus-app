// ============================================================
// 校园生活服务平台 - 模拟数据
// ============================================================

// ---------- 食堂列表 ----------
export interface Canteen {
  id: number
  name: string
  location: string
  rating: number
  tags: string[]
  image: string
}

export const canteens: Canteen[] = [
  {
    id: 1,
    name: '第一食堂',
    location: '教学楼A区东侧',
    rating: 4.2,
    tags: ['家常菜', '快餐', '面食'],
    image: 'https://picsum.photos/seed/canteen1/400/250',
  },
  {
    id: 2,
    name: '第二食堂',
    location: '学生公寓B区北门',
    rating: 4.5,
    tags: ['麻辣烫', '铁板烧', '奶茶'],
    image: 'https://picsum.photos/seed/canteen2/400/250',
  },
  {
    id: 3,
    name: '第三食堂',
    location: '图书馆西南侧',
    rating: 3.8,
    tags: ['自助餐', '小炒', '砂锅'],
    image: 'https://picsum.photos/seed/canteen3/400/250',
  },
  {
    id: 4,
    name: '教工食堂',
    location: '行政楼后方',
    rating: 4.0,
    tags: ['小碗菜', '炖汤', '清淡'],
    image: 'https://picsum.photos/seed/canteen4/400/250',
  },
]

// ---------- 二手商品列表 ----------
export interface Item {
  id: number
  title: string
  price: number
  category: string
  image: string
  seller: string
}

export const items: Item[] = [
  {
    id: 1,
    title: '高等数学（第七版）上册',
    price: 15,
    category: '教材',
    image: 'https://picsum.photos/seed/item1/300/300',
    seller: '小李同学',
  },
  {
    id: 2,
    title: '全新台灯 护眼LED',
    price: 35,
    category: '电子',
    image: 'https://picsum.photos/seed/item2/300/300',
    seller: '张同学',
  },
  {
    id: 3,
    title: '羽毛球拍（九成新）',
    price: 60,
    category: '生活',
    image: 'https://picsum.photos/seed/item3/300/300',
    seller: '运动达人',
  },
  {
    id: 4,
    title: '大学英语四级真题',
    price: 10,
    category: '教材',
    image: 'https://picsum.photos/seed/item4/300/300',
    seller: '英语小能手',
  },
  {
    id: 5,
    title: '便携蓝牙音箱',
    price: 45,
    category: '电子',
    image: 'https://picsum.photos/seed/item5/300/300',
    seller: '数码控',
  },
  {
    id: 6,
    title: '自行车锁 密码锁',
    price: 20,
    category: '其他',
    image: 'https://picsum.photos/seed/item6/300/300',
    seller: '小陈同学',
  },
  {
    id: 7,
    title: '线性代数辅导书',
    price: 12,
    category: '教材',
    image: 'https://picsum.photos/seed/item7/300/300',
    seller: '学霸A',
  },
]

// ---------- 评价列表 ----------
export interface Review {
  id: number
  canteenId: number
  username: string
  content: string
  rating: number
  time: string
}

export const reviews: Review[] = [
  // 第一食堂
  {
    id: 1,
    canteenId: 1,
    username: '匿名同学',
    content: '红烧肉做得不错，肥而不腻，价格实惠！',
    rating: 4.5,
    time: '2025-03-10',
  },
  {
    id: 2,
    canteenId: 1,
    username: '小吃货',
    content: '面食窗口的拉面很劲道，推荐牛肉拉面。',
    rating: 4.0,
    time: '2025-03-12',
  },
  // 第二食堂
  {
    id: 3,
    canteenId: 2,
    username: '辣妹子',
    content: '麻辣烫真的很正宗，辣椒够味！每次去都排队。',
    rating: 5.0,
    time: '2025-03-08',
  },
  {
    id: 4,
    canteenId: 2,
    username: '奶茶控',
    content: '新开的奶茶店不错，推荐芋泥波波奶茶。',
    rating: 4.5,
    time: '2025-03-15',
  },
  {
    id: 5,
    canteenId: 2,
    username: '干饭人',
    content: '铁板烧窗口量有点少，男生吃不太饱。',
    rating: 3.0,
    time: '2025-03-18',
  },
  // 第三食堂
  {
    id: 6,
    canteenId: 3,
    username: '养生达人',
    content: '自助餐品种挺多的，但味道一般，胜在便宜。',
    rating: 3.5,
    time: '2025-03-05',
  },
  {
    id: 7,
    canteenId: 3,
    username: '砂锅爱好者',
    content: '砂锅豆腐超级好吃，冬天来一份暖暖的。',
    rating: 4.0,
    time: '2025-03-20',
  },
  // 教工食堂
  {
    id: 8,
    canteenId: 4,
    username: '学生代表',
    content: '教工食堂的小碗菜很适合一个人吃，味道不错。',
    rating: 4.0,
    time: '2025-03-14',
  },
  {
    id: 9,
    canteenId: 4,
    username: '汤达人',
    content: '炖汤真材实料，排骨玉米汤很好喝。',
    rating: 4.5,
    time: '2025-03-22',
  },
]