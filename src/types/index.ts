export interface Product {
  id: string;
  sku: string;
  name: string;
  image: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  margin: number;
  shopId: string;
  createdAt: string;
}

export interface Shop {
  id: string;
  name: string;
  platform: 'taobao' | 'jd' | 'pdd' | 'douyin';
  status: 'active' | 'inactive';
}

export interface PromotionRule {
  id: string;
  type: 'full_reduce' | 'discount' | 'gift';
  threshold?: number;
  discountValue: number;
  discountType: 'fixed' | 'percentage';
  giftProductId?: string;
  giftQuantity?: number;
  priority: number;
}

export interface Activity {
  id: string;
  name: string;
  type: 'discount' | 'full_reduce' | 'gift';
  startTime: string;
  endTime: string;
  platform: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'running' | 'ended';
  productIds: string[];
  promotionRules: PromotionRule[];
  totalDiscount: number;
  createdAt: string;
  description?: string;
}

export interface PriceCheckRecord {
  id: string;
  activityId: string;
  productId: string;
  originalPrice: number;
  activityPrice: number;
  finalPrice: number;
  belowCost: boolean;
  couponRisk: boolean;
  riskValue: number;
  riskLevel: 'low' | 'medium' | 'high';
  auditStatus: 'pending' | 'approved' | 'rejected';
  auditRemark?: string;
  auditedAt?: string;
}

export interface ActivityDailyData {
  id: string;
  activityId: string;
  date: string;
  visitors: number;
  orders: number;
  conversionRate: number;
  gmv: number;
  profit: number;
  unitsSold: number;
}

export interface ProductFilter {
  shopId?: string;
  category?: string;
  minStock?: number;
  maxStock?: number;
  minMargin?: number;
  maxMargin?: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export interface ActivitySummary {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  status: Activity['status'];
  totalGmv: number;
  totalOrders: number;
  conversionRate: number;
}

export type PlatformType = 'taobao' | 'jd' | 'pdd' | 'douyin';

export const platformLabels: Record<PlatformType, string> = {
  taobao: '淘宝',
  jd: '京东',
  pdd: '拼多多',
  douyin: '抖音',
};

export const statusLabels: Record<Activity['status'], string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  running: '进行中',
  ended: '已结束',
};

export const statusColors: Record<Activity['status'], string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  running: 'bg-blue-100 text-blue-700',
  ended: 'bg-slate-100 text-slate-700',
};

export const riskLevelColors: Record<PriceCheckRecord['riskLevel'], string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

export const riskLevelLabels: Record<PriceCheckRecord['riskLevel'], string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

export const auditStatusLabels: Record<PriceCheckRecord['auditStatus'], string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

export const auditStatusColors: Record<PriceCheckRecord['auditStatus'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};
