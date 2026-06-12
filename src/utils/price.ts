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
  finalPrice: number,
  shopCoupon: number = 20,
  platformCoupon: number = 0
): Omit<PriceCheckRecord, 'id' | 'activityId' | 'productId' | 'originalPrice' | 'activityPrice' | 'finalPrice' | 'shopCouponAmount' | 'platformCouponAmount' | 'auditStatus' | 'auditRemark' | 'auditedAt'> => {
  const belowCost = finalPrice < product.costPrice;
  const couponRisk = activityPrice < product.costPrice;
  
  const margin = finalPrice > 0 ? ((finalPrice - product.costPrice) / finalPrice) * 100 : 0;
  const nearCostRisk = !belowCost && margin >= 0 && margin < 10;

  let riskValue = 0;
  const riskDescriptions: string[] = [];

  if (belowCost) {
    riskValue = Math.round(((product.costPrice - finalPrice) / product.costPrice) * 100);
    riskDescriptions.push(`到手价低于成本价，预计亏损 ${riskValue}%`);
    if (shopCoupon > 0) {
      riskDescriptions.push(`含店铺券 ¥${shopCoupon}`);
    }
    if (platformCoupon > 0) {
      riskDescriptions.push(`含平台券 ¥${platformCoupon}`);
    }
  } else if (couponRisk) {
    riskValue = Math.round(((product.costPrice - activityPrice) / product.costPrice) * 100);
    riskDescriptions.push(`活动价已低于成本价，叠加优惠券后将亏损`);
  } else if (nearCostRisk) {
    riskValue = Math.round(10 - margin);
    if (shopCoupon > 0 || platformCoupon > 0) {
      const couponTotal = shopCoupon + platformCoupon;
      riskDescriptions.push(`叠加${shopCoupon > 0 ? '店铺券' : ''}${shopCoupon > 0 && platformCoupon > 0 ? '+' : ''}${platformCoupon > 0 ? '平台券' : ''}（共 ¥${couponTotal}）后，毛利率仅 ${margin.toFixed(1)}%，接近成本线`);
    } else {
      riskDescriptions.push(`毛利率仅 ${margin.toFixed(1)}%，利润空间极小`);
    }
  } else {
    riskDescriptions.push(`毛利率 ${margin.toFixed(1)}%，价格合理，可正常参与活动`);
  }

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (belowCost || riskValue >= 25) {
    riskLevel = 'high';
  } else if (couponRisk || nearCostRisk || riskValue >= 10) {
    riskLevel = 'medium';
  }

  return {
    belowCost,
    couponRisk,
    nearCostRisk,
    riskValue,
    riskLevel,
    riskDescription: riskDescriptions.join('；'),
  };
};

export const generatePriceCheckRecord = (
  activityId: string,
  product: Product,
  rules: PromotionRule[],
  shopCoupon: number = 20,
  platformCoupon: number = 0
): PriceCheckRecord => {
  const originalPrice = product.salePrice;
  const activityPrice = calculateActivityPrice(originalPrice, rules);
  const finalPrice = calculateFinalPrice(activityPrice, shopCoupon, platformCoupon);
  const riskInfo = detectRisk(product, activityPrice, finalPrice, shopCoupon, platformCoupon);

  return {
    id: `check-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    activityId,
    productId: product.id,
    originalPrice,
    activityPrice,
    finalPrice,
    shopCouponAmount: shopCoupon,
    platformCouponAmount: platformCoupon,
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
