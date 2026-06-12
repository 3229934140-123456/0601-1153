import * as XLSX from 'xlsx';
import type { Product, PriceCheckRecord, Activity, ActivityDailyData } from '../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export interface ExportActivityListItem {
  activityName: string;
  sku: string;
  productName: string;
  originalPrice: number;
  activityPrice: number;
  finalPrice: number;
  costPrice: number;
  stock: number;
  margin: number;
  riskLevel: string;
  auditStatus: string;
}

export const exportSignupList = (
  activity: Activity,
  products: Product[],
  priceChecks: PriceCheckRecord[]
): void => {
  const data: ExportActivityListItem[] = activity.productIds.map((productId) => {
    const product = products.find((p) => p.id === productId)!;
    const check = priceChecks.find((c) => c.productId === productId)!;
    
    return {
      activityName: activity.name,
      sku: product.sku,
      productName: product.name,
      originalPrice: product.salePrice,
      activityPrice: check.activityPrice,
      finalPrice: check.finalPrice,
      costPrice: product.costPrice,
      stock: product.stock,
      margin: ((check.finalPrice - product.costPrice) / check.finalPrice) * 100,
      riskLevel: check.riskLevel === 'low' ? '低风险' : check.riskLevel === 'medium' ? '中风险' : '高风险',
      auditStatus: check.auditStatus === 'approved' ? '已通过' : check.auditStatus === 'rejected' ? '已驳回' : '待审核',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '报名清单');
  XLSX.writeFile(wb, `活动报名清单_${activity.name}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
};

export interface ExportSummaryItem {
  date: string;
  visitors: number;
  orders: number;
  conversionRate: number;
  gmv: number;
  profit: number;
  unitsSold: number;
  avgOrderValue: number;
}

export interface ExportDashboardData {
  activityInfo: {
    name: string;
    startTime: string;
    endTime: string;
    platform: string;
  };
  summary: {
    totalVisitors: number;
    totalOrders: number;
    avgConversionRate: number;
    totalGmv: number;
    totalProfit: number;
    totalUnitsSold: number;
    avgOrderValue: number;
  };
  dailyData: ExportSummaryItem[];
  comparison: {
    period: string;
    visitorsChange: number;
    ordersChange: number;
    conversionRateChange: number;
    gmvChange: number;
    profitChange: number;
  };
}

export const exportDashboardReport = (
  activity: Activity,
  dailyData: ActivityDailyData[],
  comparisonData?: ExportDashboardData['comparison']
): void => {
  const totalVisitors = dailyData.reduce((sum, d) => sum + d.visitors, 0);
  const totalOrders = dailyData.reduce((sum, d) => sum + d.orders, 0);
  const totalGmv = dailyData.reduce((sum, d) => sum + d.gmv, 0);
  const totalProfit = dailyData.reduce((sum, d) => sum + d.profit, 0);
  const totalUnitsSold = dailyData.reduce((sum, d) => sum + d.unitsSold, 0);
  const avgConversionRate = dailyData.length > 0 
    ? dailyData.reduce((sum, d) => sum + d.conversionRate, 0) / dailyData.length 
    : 0;
  const avgOrderValue = totalOrders > 0 ? totalGmv / totalOrders : 0;

  const exportData: ExportDashboardData = {
    activityInfo: {
      name: activity.name,
      startTime: format(new Date(activity.startTime), 'yyyy-MM-dd', { locale: zhCN }),
      endTime: format(new Date(activity.endTime), 'yyyy-MM-dd', { locale: zhCN }),
      platform: activity.platform,
    },
    summary: {
      totalVisitors,
      totalOrders,
      avgConversionRate,
      totalGmv,
      totalProfit,
      totalUnitsSold,
      avgOrderValue,
    },
    dailyData: dailyData.map((d) => ({
      date: d.date,
      visitors: d.visitors,
      orders: d.orders,
      conversionRate: d.conversionRate,
      gmv: d.gmv,
      profit: d.profit,
      unitsSold: d.unitsSold,
      avgOrderValue: d.orders > 0 ? d.gmv / d.orders : 0,
    })),
    comparison: comparisonData || {
      period: '活动前7天',
      visitorsChange: 0,
      ordersChange: 0,
      conversionRateChange: 0,
      gmvChange: 0,
      profitChange: 0,
    },
  };

  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['活动复盘报告'],
    [''],
    ['活动信息'],
    ['活动名称', exportData.activityInfo.name],
    ['活动时间', `${exportData.activityInfo.startTime} 至 ${exportData.activityInfo.endTime}`],
    ['活动平台', exportData.activityInfo.platform],
    [''],
    ['核心指标汇总'],
    ['指标', '数值', '同比变化'],
    ['访客数', exportData.summary.totalVisitors.toLocaleString(), `${exportData.comparison.visitorsChange > 0 ? '+' : ''}${exportData.comparison.visitorsChange.toFixed(1)}%`],
    ['订单数', exportData.summary.totalOrders.toLocaleString(), `${exportData.comparison.ordersChange > 0 ? '+' : ''}${exportData.comparison.ordersChange.toFixed(1)}%`],
    ['转化率', `${exportData.summary.avgConversionRate.toFixed(2)}%`, `${exportData.comparison.conversionRateChange > 0 ? '+' : ''}${exportData.comparison.conversionRateChange.toFixed(1)}%`],
    ['成交额(GMV)', `¥${exportData.summary.totalGmv.toLocaleString()}`, `${exportData.comparison.gmvChange > 0 ? '+' : ''}${exportData.comparison.gmvChange.toFixed(1)}%`],
    ['利润额', `¥${exportData.summary.totalProfit.toLocaleString()}`, `${exportData.comparison.profitChange > 0 ? '+' : ''}${exportData.comparison.profitChange.toFixed(1)}%`],
    ['销售件数', exportData.summary.totalUnitsSold.toLocaleString(), '-'],
    ['客单价', `¥${exportData.summary.avgOrderValue.toFixed(2)}`, '-'],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, '核心指标');

  const dailyHeaders = ['日期', '访客数', '订单数', '转化率', '成交额', '利润', '销售件数', '客单价'];
  const dailyRows = exportData.dailyData.map((d) => [
    d.date,
    d.visitors,
    d.orders,
    `${d.conversionRate.toFixed(2)}%`,
    d.gmv,
    d.profit,
    d.unitsSold,
    d.avgOrderValue.toFixed(2),
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([dailyHeaders, ...dailyRows]);
  XLSX.utils.book_append_sheet(wb, ws2, '每日明细');

  XLSX.writeFile(wb, `活动复盘报告_${activity.name}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
};
