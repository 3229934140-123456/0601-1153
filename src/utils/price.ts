import type { Product, PromotionRule, PriceCheckRecord } from '../types';

export const calculateActivityPrice = (
  originalPrice: number,
  rules: PromotionRule[]
): number => {
  let activityPrice = originalPrice;

  for (const rule of rules) {
    if (rule.type === 'discount' && rule.discountType === 'percentage') {
      activityPrice = Math.round(activityPrice * (1 - rule.discountValue / 100) * 100) / 100;
    }
  }

  for (const rule of rules) {
    if (rule.type === 'full_reduce' && rule.threshold && rule.discountType === 'fixed') {
      if (activityPrice >= rule.threshold) {
        activityPrice = Math.round((activityPrice - rule.discountValue) * 100) / 100;
      }
    }
  }

  return Math.max(0, activityPrice);
};

export const calculateFinalPrice = (
  activityPrice: number,
  shopCoupon: number = 20,
  platformCoupon: number = 0
): number => {
  return Math.max(0, Math.round((activityPrice - shopCoupon - platformCoupon) * 100) / 100);
};

export const detectRisk = (
  product: Product,
  activityPrice: number,
  finalPrice: number
): Omit<PriceCheckRecord, 'id' | 'activityId' | 'productId' | 'originalPrice' | 'activityPrice' | 'finalPrice' | 'auditStatus' | 'auditRemark' | 'auditedAt'> => {
  const belowCost = finalPrice < product.costPrice;
  const couponRisk = activityPrice < product.costPrice;

  let riskValue = 0;
  if (belowCost) {
    riskValue = Math.round(((product.costPrice - finalPrice) / product.costPrice) * 100);
  } else if (couponRisk) {
    riskValue = Math.round(((product.costPrice - activityPrice) / product.costPrice) * 100);
  } else {
    const margin = ((finalPrice - product.costPrice) / finalPrice) * 100;
    if (margin < 10) {
      riskValue = Math.round(10 - margin);
    }
  }

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (belowCost || riskValue >= 25) {
    riskLevel = 'high';
  } else if (couponRisk || riskValue >= 15) {
    riskLevel = 'medium';
  }

  return {
    belowCost,
    couponRisk,
    riskValue,
    riskLevel,
  };
};

export const generatePriceCheckRecord = (
  activityId: string,
  product: Product,
  rules: PromotionRule[]
): PriceCheckRecord => {
  const originalPrice = product.salePrice;
  const activityPrice = calculateActivityPrice(originalPrice, rules);
  const finalPrice = calculateFinalPrice(activityPrice);
  const riskInfo = detectRisk(product, activityPrice, finalPrice);

  return {
    id: `check-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    activityId,
    productId: product.id,
    originalPrice,
    activityPrice,
    finalPrice,
    ...riskInfo,
    auditStatus: 'pending',
  };
};

export const formatCurrency = (value: number): string => {
  return `¥${value.toFixed(2)}`;
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
