import type { Product, Shop, Activity, PriceCheckRecord, ActivityDailyData, PromotionRule } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const mockShops: Shop[] = [
  { id: 'shop-1', name: '优品服饰旗舰店', platform: 'taobao', status: 'active' },
  { id: 'shop-2', name: '数码家电专营店', platform: 'jd', status: 'active' },
  { id: 'shop-3', name: '美妆护肤小店', platform: 'pdd', status: 'active' },
  { id: 'shop-4', name: '家居生活优选', platform: 'douyin', status: 'active' },
];

const categories = ['服饰', '数码', '美妆', '家居', '食品', '母婴'];

const productImages = [
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=product%20photo%20fashion%20clothing%20t-shirt&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=product%20photo%20electronics%20smartphone&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=product%20photo%20skincare%20cosmetics%20bottle&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=product%20photo%20home%20kitchen%20appliance&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=product%20photo%20snack%20food%20package&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=product%20photo%20baby%20clothing%20soft&image_size=square',
];

const productNames = [
  '纯棉休闲T恤短袖', '智能无线蓝牙耳机', '保湿精华液50ml',
  '北欧风陶瓷马克杯', '进口坚果礼盒装', '婴儿连体衣春秋款',
  '男士商务衬衫正装', '智能手表运动版', '防晒霜SPF50+',
  '多功能厨房料理机', '有机燕麦片500g', '儿童益智拼图玩具',
  '女士连衣裙夏季', '平板电脑保护套', '口红礼盒套装',
  '乳胶记忆枕头', '进口牛排套餐', '婴儿尿不湿L码',
  '运动跑步鞋男款', '无线充电器快充', '面膜补水保湿',
  '简约布艺沙发', '零食大礼包', '儿童学习桌椅套装',
];

export const mockProducts: Product[] = Array.from({ length: 24 }, (_, i) => {
  const costPrice = Math.round((20 + Math.random() * 480) * 100) / 100;
  const salePrice = Math.round(costPrice * (1.3 + Math.random() * 1.2) * 100) / 100;
  const margin = Math.round(((salePrice - costPrice) / salePrice) * 100);
  const categoryIndex = i % 6;
  return {
    id: `prod-${i + 1}`,
    sku: `SKU${String(10000 + i).padStart(6, '0')}`,
    name: productNames[i % productNames.length],
    image: productImages[categoryIndex],
    category: categories[categoryIndex],
    costPrice,
    salePrice,
    stock: Math.floor(Math.random() * 2000) + 50,
    margin,
    shopId: mockShops[i % 4].id,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
});

const mockPromotionRules: PromotionRule[] = [
  {
    id: 'rule-1',
    type: 'full_reduce',
    threshold: 200,
    discountValue: 30,
    discountType: 'fixed',
    priority: 1,
  },
  {
    id: 'rule-2',
    type: 'full_reduce',
    threshold: 400,
    discountValue: 80,
    discountType: 'fixed',
    priority: 2,
  },
];

const mockPromotionRules2: PromotionRule[] = [
  {
    id: 'rule-3',
    type: 'discount',
    discountValue: 15,
    discountType: 'percentage',
    priority: 1,
  },
];

export const mockActivities: Activity[] = [
  {
    id: 'act-1',
    name: '618年中大促',
    type: 'full_reduce',
    startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    platform: 'taobao',
    status: 'running',
    productIds: ['prod-1', 'prod-2', 'prod-3', 'prod-7', 'prod-8', 'prod-9'],
    promotionRules: mockPromotionRules,
    totalDiscount: 5000,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    description: '618全场满减活动，跨店满200减30，满400减80',
  },
  {
    id: 'act-2',
    name: '新品上市85折',
    type: 'discount',
    startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    platform: 'jd',
    status: 'pending',
    productIds: ['prod-4', 'prod-5', 'prod-6', 'prod-10', 'prod-11', 'prod-12'],
    promotionRules: mockPromotionRules2,
    totalDiscount: 3000,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    description: '夏季新品上市，全场85折优惠',
  },
  {
    id: 'act-3',
    name: '母亲节特惠',
    type: 'full_reduce',
    startTime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    platform: 'pdd',
    status: 'ended',
    productIds: ['prod-13', 'prod-14', 'prod-15', 'prod-16', 'prod-17', 'prod-18'],
    promotionRules: [{ id: 'rule-4', type: 'full_reduce', threshold: 300, discountValue: 50, discountType: 'fixed', priority: 1 }],
    totalDiscount: 8000,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    description: '母亲节特别优惠活动',
  },
  {
    id: 'act-4',
    name: '双11预热活动',
    type: 'gift',
    startTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    platform: 'taobao',
    status: 'draft',
    productIds: ['prod-19', 'prod-20', 'prod-21', 'prod-22', 'prod-23', 'prod-24'],
    promotionRules: [{ id: 'rule-5', type: 'gift', discountValue: 0, discountType: 'fixed', giftProductId: 'prod-24', giftQuantity: 1, priority: 1 }],
    totalDiscount: 0,
    createdAt: new Date().toISOString(),
    description: '双11预热买赠活动',
  },
];

export const mockPriceCheckRecords: PriceCheckRecord[] = [
  {
    id: 'check-1',
    activityId: 'act-2',
    productId: 'prod-4',
    originalPrice: 199,
    activityPrice: 169.15,
    finalPrice: 149.15,
    shopCouponAmount: 20,
    platformCouponAmount: 0,
    belowCost: false,
    couponRisk: false,
    nearCostRisk: false,
    riskValue: 5,
    riskLevel: 'low',
    riskDescription: '毛利率合理，可正常参与活动',
    auditStatus: 'pending',
  },
  {
    id: 'check-2',
    activityId: 'act-2',
    productId: 'prod-5',
    originalPrice: 89,
    activityPrice: 75.65,
    finalPrice: 55.65,
    shopCouponAmount: 20,
    platformCouponAmount: 0,
    belowCost: true,
    couponRisk: true,
    nearCostRisk: false,
    riskValue: 35,
    riskLevel: 'high',
    riskDescription: '到手价低于成本价，预计亏损 35%；含店铺券 ¥20',
    auditStatus: 'pending',
  },
  {
    id: 'check-3',
    activityId: 'act-2',
    productId: 'prod-6',
    originalPrice: 328,
    activityPrice: 278.8,
    finalPrice: 248.8,
    shopCouponAmount: 20,
    platformCouponAmount: 10,
    belowCost: false,
    couponRisk: false,
    nearCostRisk: false,
    riskValue: 8,
    riskLevel: 'low',
    riskDescription: '毛利率合理，可正常参与活动',
    auditStatus: 'pending',
  },
  {
    id: 'check-4',
    activityId: 'act-2',
    productId: 'prod-10',
    originalPrice: 459,
    activityPrice: 390.15,
    finalPrice: 310.15,
    shopCouponAmount: 20,
    platformCouponAmount: 60,
    belowCost: false,
    couponRisk: true,
    nearCostRisk: false,
    riskValue: 18,
    riskLevel: 'medium',
    riskDescription: '叠加店铺券+平台券（共 ¥80）后，毛利率较低，接近成本线',
    auditStatus: 'pending',
  },
  {
    id: 'check-5',
    activityId: 'act-2',
    productId: 'prod-11',
    originalPrice: 58,
    activityPrice: 49.3,
    finalPrice: 39.3,
    shopCouponAmount: 10,
    platformCouponAmount: 0,
    belowCost: true,
    couponRisk: false,
    nearCostRisk: false,
    riskValue: 28,
    riskLevel: 'high',
    riskDescription: '到手价低于成本价，预计亏损 28%',
    auditStatus: 'pending',
  },
  {
    id: 'check-6',
    activityId: 'act-2',
    productId: 'prod-12',
    originalPrice: 268,
    activityPrice: 227.8,
    finalPrice: 197.8,
    shopCouponAmount: 20,
    platformCouponAmount: 10,
    belowCost: false,
    couponRisk: false,
    nearCostRisk: true,
    riskValue: 7,
    riskLevel: 'medium',
    riskDescription: '叠加店铺券+平台券（共 ¥30）后，毛利率仅 6.2%，接近成本线',
    auditStatus: 'pending',
  },
];

const generateDailyData = (activityId: string, days: number, startDate: Date): ActivityDailyData[] => {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const visitors = Math.floor(2000 + Math.random() * 5000);
    const conversionRate = Math.round((2 + Math.random() * 4) * 100) / 100;
    const orders = Math.floor(visitors * conversionRate / 100);
    const avgOrderValue = 150 + Math.random() * 200;
    const gmv = Math.round(orders * avgOrderValue * 100) / 100;
    const profit = Math.round(gmv * (0.2 + Math.random() * 0.2) * 100) / 100;
    const unitsSold = Math.floor(orders * (1 + Math.random() * 1.5));

    return {
      id: `data-${activityId}-${i}`,
      activityId,
      date: date.toISOString().split('T')[0],
      visitors,
      orders,
      conversionRate,
      gmv,
      profit,
      unitsSold,
    };
  });
};

export const mockActivityData: ActivityDailyData[] = [
  ...generateDailyData('act-1', 7, new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
  ...generateDailyData('act-3', 7, new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)),
];

export const mockSelectedProductIds: string[] = ['prod-1', 'prod-3', 'prod-5', 'prod-7', 'prod-9'];
