import { useState, useMemo, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  Percent,
  Package,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Edit3,
  Check,
  X,
  Plus,
  AlertTriangle,
  Target,
  Store,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAppStore } from '@/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { MetricCard } from '@/components/ui/MetricCard';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatPercentage } from '@/utils/price';
import { formatDate, formatDateRange, getCalendarDays, getMonthLabel, isToday, isCurrentMonth, getActivitiesForDate } from '@/utils/date';
import { exportDashboardReport } from '@/utils/export';
import { cn } from '@/lib/utils';
import { statusLabels, statusColors, platformLabels } from '@/types';
import type { Activity, Shop } from '@/types';

export default function Dashboard() {
  const {
    activities,
    products,
    shops,
    activityData,
    getActivityById,
    getActivityDailyData,
    getActivitySummary,
    getActivityProducts,
    addOrUpdateActivityDailyData,
  } = useAppStore();

  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    activities.find((a) => a.status === 'running')?.id || activities[0]?.id || null
  );
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [showActivityDetail, setShowActivityDetail] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    date: '',
    visitors: 0,
    orders: 0,
    gmv: 0,
  });
  const [showAddDataModal, setShowAddDataModal] = useState(false);
  const [calendarPlatformFilter, setCalendarPlatformFilter] = useState<string>('');
  const [calendarShopFilter, setCalendarShopFilter] = useState<string>('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);

  const selectedActivity = selectedActivityId ? getActivityById(selectedActivityId) : null;
  const dailyData = selectedActivityId ? getActivityDailyData(selectedActivityId) : [];
  const summary = selectedActivityId ? getActivitySummary(selectedActivityId) : null;

  const calendarDays = useMemo(() => {
    return getCalendarDays(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const allActivities = activities;

  const getActivityShops = useCallback((activityId: string): Shop[] => {
    const prods = getActivityProducts(activityId);
    const shopIds = new Set(prods.map((p) => p.shopId).filter(Boolean));
    return shops.filter((s) => shopIds.has(s.id));
  }, [getActivityProducts, shops]);

  const filteredCalendarActivities = useMemo(() => {
    return allActivities.filter((a) => {
      if (a.status === 'draft') return false;
      if (calendarPlatformFilter && a.platform !== calendarPlatformFilter) return false;
      if (calendarShopFilter) {
        const activityShops = getActivityShops(a.id);
        const hasShop = activityShops.some((s) => s.id === calendarShopFilter);
        if (!hasShop) return false;
      }
      return true;
    });
  }, [allActivities, calendarPlatformFilter, calendarShopFilter, getActivityShops]);

  const targetAchievement = useMemo(() => {
    if (!selectedActivity || !summary) return null;
    const gmvRate = selectedActivity.targetGmv ? (summary.totalGmv / selectedActivity.targetGmv) * 100 : null;
    const ordersRate = selectedActivity.targetOrders ? (summary.totalOrders / selectedActivity.targetOrders) * 100 : null;
    const profitMargin = summary.totalGmv > 0 ? (summary.totalProfit / summary.totalGmv) * 100 : 0;
    const profitRate = selectedActivity.targetProfitMargin ? (profitMargin / selectedActivity.targetProfitMargin) * 100 : null;
    const conversionRate = summary.avgConversionRate;
    const conversionRateTarget = selectedActivity.targetConversionRate;
    const conversionRate_achieved = conversionRateTarget ? (conversionRate / conversionRateTarget) * 100 : null;

    const alerts: string[] = [];
    if (gmvRate !== null && gmvRate < 50) alerts.push('成交额达成率低于 50%');
    if (ordersRate !== null && ordersRate < 50) alerts.push('订单数达成率低于 50%');
    if (profitRate !== null && profitRate < 60) alerts.push('毛利率低于目标 60%');
    if (conversionRate_achieved !== null && conversionRate_achieved < 60) alerts.push('转化率低于目标 60%');

    return {
      gmvRate,
      ordersRate,
      profitRate,
      profitMargin,
      conversionRate_achieved,
      conversionRate,
      alerts,
      hasTarget: !!(selectedActivity.targetGmv || selectedActivity.targetOrders || selectedActivity.targetProfitMargin || selectedActivity.targetConversionRate),
    };
  }, [selectedActivity, summary]);

  interface DailyAlertInfo {
    hasAlert: boolean;
    failedMetrics: string[];
    gmvOk: boolean;
    ordersOk: boolean;
    profitOk: boolean;
    conversionOk: boolean;
  }

  const dailyAlerts = useMemo<Map<string, DailyAlertInfo>>(() => {
    const alertMap = new Map<string, DailyAlertInfo>();
    if (!selectedActivity) return alertMap;
    if (dailyData.length === 0) return alertMap;

    const hasTarget = selectedActivity.targetGmv || selectedActivity.targetOrders || selectedActivity.targetProfitMargin || selectedActivity.targetConversionRate;
    if (!hasTarget) return alertMap;

    const days = dailyData.length;
    const expectedDailyGmv = selectedActivity.targetGmv ? selectedActivity.targetGmv / Math.max(days, 1) : 0;
    const expectedDailyOrders = selectedActivity.targetOrders ? selectedActivity.targetOrders / Math.max(days, 1) : 0;

    dailyData.forEach((d) => {
      const failedMetrics: string[] = [];
      const gmvOk = !selectedActivity.targetGmv || d.gmv >= expectedDailyGmv * 0.6;
      const ordersOk = !selectedActivity.targetOrders || d.orders >= expectedDailyOrders * 0.6;
      const dayProfitMargin = d.gmv > 0 ? (d.profit / d.gmv) * 100 : 0;
      const profitOk = !selectedActivity.targetProfitMargin || dayProfitMargin >= selectedActivity.targetProfitMargin * 0.6;
      const conversionOk = !selectedActivity.targetConversionRate || d.conversionRate >= selectedActivity.targetConversionRate * 0.6;

      if (!gmvOk) failedMetrics.push('成交额');
      if (!ordersOk) failedMetrics.push('订单数');
      if (!profitOk) failedMetrics.push('毛利率');
      if (!conversionOk) failedMetrics.push('转化率');

      alertMap.set(d.date, {
        hasAlert: failedMetrics.length > 0,
        failedMetrics,
        gmvOk,
        ordersOk,
        profitOk,
        conversionOk,
      });
    });
    return alertMap;
  }, [selectedActivity, dailyData]);

  const chartData = useMemo(() => {
    return dailyData.map((d) => ({
      date: d.date.slice(5),
      成交额: d.gmv / 10000,
      订单数: d.orders,
      访客数: d.visitors / 1000,
    }));
  }, [dailyData]);

  const trendData = useMemo(() => {
    return dailyData.map((d) => ({
      date: d.date.slice(5),
      转化率: d.conversionRate,
      毛利率: ((d.profit / d.gmv) * 100).toFixed(1),
    }));
  }, [dailyData]);

  const categoryData = useMemo(() => {
    if (!selectedActivity) return [];
    const categorySales: Record<string, number> = {};
    selectedActivity.productIds.forEach((pid) => {
      const product = products.find((p) => p.id === pid);
      if (product) {
        categorySales[product.category] = (categorySales[product.category] || 0) + 1;
      }
    });
    return Object.entries(categorySales).map(([name, value]) => ({ name, value }));
  }, [selectedActivity, products]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899'];

  const comparisonData = useMemo(() => {
    if (!summary) return null;
    return {
      visitorsChange: 23.5,
      ordersChange: 18.2,
      conversionRateChange: -2.1,
      gmvChange: 15.8,
      profitChange: 12.3,
    };
  }, [summary]);

  const handleExport = () => {
    if (!selectedActivity || !selectedActivityId) return;
    const data = getActivityDailyData(selectedActivityId);
    exportDashboardReport(selectedActivity, data, {
      period: '活动前7天',
      visitorsChange: comparisonData?.visitorsChange || 0,
      ordersChange: comparisonData?.ordersChange || 0,
      conversionRateChange: comparisonData?.conversionRateChange || 0,
      gmvChange: comparisonData?.gmvChange || 0,
      profitChange: comparisonData?.profitChange || 0,
    });
    setShowExportModal(false);
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleStartEdit = (row: any) => {
    setEditingDateId(row.id);
    setEditForm({
      date: row.date,
      visitors: row.visitors,
      orders: row.orders,
      gmv: row.gmv,
    });
  };

  const handleCancelEdit = () => {
    setEditingDateId(null);
  };

  const handleSaveEdit = () => {
    if (!selectedActivityId || !editingDateId) return;
    const visitors = Number(editForm.visitors) || 0;
    const orders = Math.max(0, Math.min(Number(editForm.orders) || 0, visitors));
    const gmv = Number(editForm.gmv) || 0;
    const conversionRate = visitors > 0 ? (orders / visitors) * 100 : 0;
    const avgOrderValue = orders > 0 ? gmv / orders : 0;
    const avgCost = 60;
    const profit = orders > 0 ? Math.round(orders * (avgOrderValue - avgCost)) : 0;
    const unitsSold = Math.round(orders * 1.2);

    addOrUpdateActivityDailyData(selectedActivityId, {
      date: editForm.date,
      visitors,
      orders,
      conversionRate,
      gmv,
      profit,
      unitsSold,
    });
    setEditingDateId(null);
  };

  const handleOpenAddModal = () => {
    const defaultDate = dailyData.length > 0
      ? dailyData[dailyData.length - 1].date
      : new Date().toISOString().slice(0, 10);
    setEditForm({
      date: defaultDate,
      visitors: 0,
      orders: 0,
      gmv: 0,
    });
    setShowAddDataModal(true);
  };

  const handleAddNewData = () => {
    if (!selectedActivityId) return;
    const visitors = Number(editForm.visitors) || 0;
    const orders = Math.max(0, Math.min(Number(editForm.orders) || 0, visitors));
    const gmv = Number(editForm.gmv) || 0;
    const conversionRate = visitors > 0 ? (orders / visitors) * 100 : 0;
    const avgOrderValue = orders > 0 ? gmv / orders : 0;
    const avgCost = 60;
    const profit = orders > 0 ? Math.round(orders * (avgOrderValue - avgCost)) : 0;
    const unitsSold = Math.round(orders * 1.2);

    addOrUpdateActivityDailyData(selectedActivityId, {
      date: editForm.date,
      visitors,
      orders,
      conversionRate,
      gmv,
      profit,
      unitsSold,
    });
    setShowAddDataModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">效果看板</h1>
          <p className="text-slate-500 mt-1">追踪活动效果，分析数据，导出复盘报告</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedActivityId || ''}
            onChange={(e) => setSelectedActivityId(e.target.value)}
            className="w-64"
          >
            <option value="">选择活动</option>
            {allActivities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.name}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={() => setShowActivityDetail(true)}>
            <Eye className="w-4 h-4 mr-2" />
            活动详情
          </Button>
          <Button onClick={() => setShowExportModal(true)}>
            <Download className="w-4 h-4 mr-2" />
            导出复盘表
          </Button>
        </div>
      </div>

      {selectedActivity && summary ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="成交额 (GMV)"
              value={(summary.totalGmv / 10000).toFixed(2)}
              prefix="¥"
              suffix="万"
              change={comparisonData?.gmvChange}
              changeLabel="较活动前"
              icon={<DollarSign className="w-5 h-5" />}
              color="blue"
            />
            <MetricCard
              title="访客数"
              value={summary.totalVisitors.toLocaleString()}
              change={comparisonData?.visitorsChange}
              changeLabel="较活动前"
              icon={<Users className="w-5 h-5" />}
              color="emerald"
            />
            <MetricCard
              title="订单数"
              value={summary.totalOrders.toLocaleString()}
              change={comparisonData?.ordersChange}
              changeLabel="较活动前"
              icon={<ShoppingCart className="w-5 h-5" />}
              color="amber"
            />
            <MetricCard
              title="转化率"
              value={summary.avgConversionRate.toFixed(2)}
              suffix="%"
              change={comparisonData?.conversionRateChange}
              changeLabel="较活动前"
              icon={<Percent className="w-5 h-5" />}
              color="purple"
            />
          </div>

          {targetAchievement?.hasTarget && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <CardTitle>目标达成率</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {targetAchievement.gmvRate !== null && (
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500">成交额达成率</span>
                        <span className={cn(
                          'text-sm font-medium',
                          targetAchievement.gmvRate >= 80 ? 'text-emerald-600' :
                          targetAchievement.gmvRate >= 50 ? 'text-amber-600' : 'text-red-600'
                        )}>
                          {targetAchievement.gmvRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={cn(
                            'h-2 rounded-full transition-all',
                            targetAchievement.gmvRate >= 80 ? 'bg-emerald-500' :
                            targetAchievement.gmvRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          )}
                          style={{ width: `${Math.min(targetAchievement.gmvRate, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        目标 ¥{(selectedActivity!.targetGmv! / 10000).toFixed(1)}万
                      </p>
                    </div>
                  )}
                  {targetAchievement.ordersRate !== null && (
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500">订单数达成率</span>
                        <span className={cn(
                          'text-sm font-medium',
                          targetAchievement.ordersRate >= 80 ? 'text-emerald-600' :
                          targetAchievement.ordersRate >= 50 ? 'text-amber-600' : 'text-red-600'
                        )}>
                          {targetAchievement.ordersRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={cn(
                            'h-2 rounded-full transition-all',
                            targetAchievement.ordersRate >= 80 ? 'bg-emerald-500' :
                            targetAchievement.ordersRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          )}
                          style={{ width: `${Math.min(targetAchievement.ordersRate, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        目标 {selectedActivity!.targetOrders!} 单
                      </p>
                    </div>
                  )}
                  {targetAchievement.profitRate !== null && (
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500">毛利率达成率</span>
                        <span className={cn(
                          'text-sm font-medium',
                          targetAchievement.profitRate >= 80 ? 'text-emerald-600' :
                          targetAchievement.profitRate >= 60 ? 'text-amber-600' : 'text-red-600'
                        )}>
                          {targetAchievement.profitRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={cn(
                            'h-2 rounded-full transition-all',
                            targetAchievement.profitRate >= 80 ? 'bg-emerald-500' :
                            targetAchievement.profitRate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          )}
                          style={{ width: `${Math.min(targetAchievement.profitRate, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        实际 {targetAchievement.profitMargin.toFixed(1)}% / 目标 {selectedActivity!.targetProfitMargin!}%
                      </p>
                    </div>
                  )}
                  {targetAchievement.conversionRate_achieved !== null && (
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500">转化率达成率</span>
                        <span className={cn(
                          'text-sm font-medium',
                          targetAchievement.conversionRate_achieved >= 80 ? 'text-emerald-600' :
                          targetAchievement.conversionRate_achieved >= 60 ? 'text-amber-600' : 'text-red-600'
                        )}>
                          {targetAchievement.conversionRate_achieved.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={cn(
                            'h-2 rounded-full transition-all',
                            targetAchievement.conversionRate_achieved >= 80 ? 'bg-emerald-500' :
                            targetAchievement.conversionRate_achieved >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          )}
                          style={{ width: `${Math.min(targetAchievement.conversionRate_achieved, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        实际 {targetAchievement.conversionRate.toFixed(2)}% / 目标 {selectedActivity!.targetConversionRate!}%
                      </p>
                    </div>
                  )}
                </div>
                {targetAchievement.alerts.length > 0 && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800">目标预警</p>
                        <ul className="text-sm text-red-600 mt-1 space-y-0.5">
                          {targetAchievement.alerts.map((alert, i) => (
                            <li key={i}>· {alert}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>核心指标趋势</CardTitle>
                  <Badge variant="info">活动期 vs 非活动期</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} />
                      <YAxis stroke="#94A3B8" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="成交额" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="订单数" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="访客数" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-500">
                    暂无数据
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>活动日历</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={prevMonth}
                      className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-slate-500" />
                    </button>
                    <span className="font-medium text-slate-800">
                      {getMonthLabel(currentYear, currentMonth)}
                    </span>
                    <button
                      onClick={nextMonth}
                      className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <Select
                      value={calendarPlatformFilter}
                      onChange={(e) => setCalendarPlatformFilter(e.target.value)}
                    >
                      <option value="">全部平台</option>
                      <option value="taobao">淘宝</option>
                      <option value="jd">京东</option>
                      <option value="pdd">拼多多</option>
                      <option value="douyin">抖音</option>
                    </Select>
                    <Select
                      value={calendarShopFilter}
                      onChange={(e) => setCalendarShopFilter(e.target.value)}
                    >
                      <option value="">全部店铺</option>
                      {shops.map((shop) => (
                        <option key={shop.id} value={shop.id}>{shop.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-2">
                    {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                      <div key={day} className="py-1">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: new Date(currentYear, currentMonth, 1).getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-10" />
                    ))}
                    {calendarDays.map((date, index) => {
                      const dayActivities = getActivitiesForDate(date, filteredCalendarActivities);
                      const hasActivity = dayActivities.length > 0;
                      const isTodayDate = isToday(date);
                      const inCurrentMonth = isCurrentMonth(date, currentYear, currentMonth);
                      const dateStr = date.toISOString().slice(0, 10);
                      const dayAlert = dailyAlerts.get(dateStr);
                      const hasAlert = dayAlert?.hasAlert;
                      const alertCount = dayAlert?.failedMetrics.length || 0;

                      return (
                        <div
                          key={index}
                          className={cn(
                            'h-10 flex items-center justify-center text-sm rounded-lg relative cursor-pointer transition-all',
                            !inCurrentMonth && 'text-slate-300',
                            isTodayDate && 'bg-blue-600 text-white font-bold',
                            hasAlert && !isTodayDate && alertCount >= 3 && 'bg-red-200 text-red-800 font-bold hover:bg-red-300',
                            hasAlert && !isTodayDate && alertCount < 3 && alertCount > 0 && 'bg-red-100 text-red-700 font-medium hover:bg-red-200',
                            hasActivity && !isTodayDate && !hasAlert && 'bg-blue-100 text-blue-700 font-medium hover:bg-blue-200',
                            !hasActivity && !isTodayDate && !hasAlert && inCurrentMonth && 'hover:bg-slate-100'
                          )}
                          title={hasActivity ? dayActivities.map((a) => a.name).join(', ') : (hasAlert ? `预警: ${dayAlert?.failedMetrics.join('、')}` : '')}
                          onClick={() => {
                            if (hasActivity || hasAlert) {
                              setSelectedCalendarDate(date);
                              setShowDayDetailModal(true);
                            }
                          }}
                        >
                          {date.getDate()}
                          {(hasActivity || hasAlert) && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                              {hasActivity && (
                                <div className={cn(
                                  'w-1 h-1 rounded-full',
                                  hasAlert ? 'bg-red-500' : 'bg-blue-600'
                                )} />
                              )}
                              {hasAlert && !hasActivity && (
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-2">本月活动</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">
                    {filteredCalendarActivities
                      .filter((a) => {
                        const start = new Date(a.startTime);
                        const end = new Date(a.endTime);
                        return (
                          (start.getFullYear() === currentYear && start.getMonth() === currentMonth) ||
                          (end.getFullYear() === currentYear && end.getMonth() === currentMonth)
                        );
                      })
                      .slice(0, 5)
                      .map((activity) => (
                        <div
                          key={activity.id}
                          onClick={() => setSelectedActivityId(activity.id)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-sm text-slate-700 truncate max-w-[120px]">
                              {activity.name}
                            </span>
                          </div>
                          <Badge className={statusColors[activity.status]}>
                            {statusLabels[activity.status]}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>转化率与毛利率趋势</CardTitle>
              </CardHeader>
              <CardContent>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} />
                      <YAxis stroke="#94A3B8" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="转化率"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="毛利率"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ fill: '#10B981', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-500">
                    暂无数据
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>商品类目分布</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {categoryData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-slate-600">{item.name}</span>
                          </div>
                          <span className="font-medium text-slate-800">{item.value} 件</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-500">
                    暂无数据
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>活动前后数据对比</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  {
                    label: '访客数',
                    current: summary?.totalVisitors.toLocaleString() || '0',
                    change: comparisonData?.visitorsChange || 0,
                    unit: '人',
                  },
                  {
                    label: '订单数',
                    current: summary?.totalOrders.toLocaleString() || '0',
                    change: comparisonData?.ordersChange || 0,
                    unit: '单',
                  },
                  {
                    label: '转化率',
                    current: `${summary?.avgConversionRate.toFixed(2) || '0'}%`,
                    change: comparisonData?.conversionRateChange || 0,
                    unit: '',
                  },
                  {
                    label: '成交额',
                    current: `¥${(summary?.totalGmv / 10000 || 0).toFixed(2)}万`,
                    change: comparisonData?.gmvChange || 0,
                    unit: '',
                  },
                  {
                    label: '利润额',
                    current: `¥${(summary?.totalProfit / 10000 || 0).toFixed(2)}万`,
                    change: comparisonData?.profitChange || 0,
                    unit: '',
                  },
                ].map((item, index) => {
                  const ChangeIcon = item.change > 0 ? ArrowUpRight : item.change < 0 ? ArrowDownRight : Minus;
                  const changeColor = item.change > 0 ? 'text-emerald-600' : item.change < 0 ? 'text-red-600' : 'text-slate-500';
                  const changeBg = item.change > 0 ? 'bg-emerald-50' : item.change < 0 ? 'bg-red-50' : 'bg-slate-50';

                  return (
                    <div key={index} className="p-4 bg-slate-50 rounded-xl text-center">
                      <p className="text-sm text-slate-500 mb-2">{item.label}</p>
                      <p className="text-xl font-bold text-slate-800 mb-2">
                        {item.current}
                        {item.unit && <span className="text-sm font-normal text-slate-500 ml-1">{item.unit}</span>}
                      </p>
                      <div className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', changeBg, changeColor)}>
                        <ChangeIcon className="w-3 h-3" />
                        {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
                      </div>
                      <p className="text-xs text-slate-400 mt-2">较活动前</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>每日明细</CardTitle>
                {selectedActivity && selectedActivity.status !== 'draft' && (
                  <Button size="sm" onClick={handleOpenAddModal}>
                    <Plus className="w-4 h-4 mr-2" />
                    补录数据
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">日期</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">访客数</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">订单数</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">转化率</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">成交额</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">利润</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">销售件数</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">客单价</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {dailyData.map((row) => (
                      editingDateId === row.id ? (
                        <tr key={row.id} className="bg-blue-50">
                          <td className="px-4 py-3">
                            <Input
                              type="date"
                              value={editForm.date}
                              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                              className="w-36"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={editForm.visitors}
                              onChange={(e) => setEditForm({ ...editForm, visitors: Number(e.target.value) })}
                              className="w-24 text-right ml-auto"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={editForm.orders}
                              onChange={(e) => setEditForm({ ...editForm, orders: Number(e.target.value) })}
                              className="w-24 text-right ml-auto"
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">
                            {editForm.visitors > 0 ? ((editForm.orders / editForm.visitors) * 100).toFixed(2) : '0.00'}%
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={editForm.gmv}
                              onChange={(e) => setEditForm({ ...editForm, gmv: Number(e.target.value) })}
                              className="w-28 text-right ml-auto"
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">
                            自动计算
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">
                            自动计算
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">
                            {editForm.orders > 0 ? formatCurrency(editForm.gmv / editForm.orders) : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={handleSaveEdit}
                                className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
                                title="保存"
                              >
                                <Check className="w-4 h-4 text-emerald-600" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                title="取消"
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={row.id} className={cn(
                          'hover:bg-slate-50 transition-colors',
                          dailyAlerts.get(row.date)?.hasAlert && 'bg-red-50/50'
                        )}>
                          <td className="px-4 py-3 text-slate-800">
                            <div className="flex items-center gap-2">
                              {row.date}
                              {dailyAlerts.get(row.date)?.hasAlert && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700"
                                  title={`未达标: ${dailyAlerts.get(row.date)?.failedMetrics.join('、')}`}
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  {dailyAlerts.get(row.date)?.failedMetrics.length}项
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">{row.visitors.toLocaleString()}</td>
                          <td className={cn(
                            'px-4 py-3 text-right',
                            dailyAlerts.get(row.date)?.ordersOk === false ? 'text-red-600 font-medium' : 'text-slate-600'
                          )}>
                            {row.orders.toLocaleString()}
                          </td>
                          <td className={cn(
                            'px-4 py-3 text-right font-medium',
                            dailyAlerts.get(row.date)?.conversionOk === false ? 'text-red-600' : 'text-blue-600'
                          )}>
                            {row.conversionRate.toFixed(2)}%
                          </td>
                          <td className={cn(
                            'px-4 py-3 text-right font-medium',
                            dailyAlerts.get(row.date)?.gmvOk === false ? 'text-red-600' : 'text-slate-800'
                          )}>
                            {formatCurrency(row.gmv)}
                          </td>
                          <td className={cn(
                            'px-4 py-3 text-right font-medium',
                            dailyAlerts.get(row.date)?.profitOk === false ? 'text-red-600' : (row.profit >= 0 ? 'text-emerald-600' : 'text-red-600')
                          )}>
                            {formatCurrency(row.profit)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">{row.unitsSold.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {row.orders > 0 ? formatCurrency(row.gmv / row.orders) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleStartEdit(row)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors inline-flex"
                              title="编辑"
                            >
                              <Edit3 className="w-4 h-4 text-slate-500" />
                            </button>
                          </td>
                        </tr>
                      )
                    ))}
                    {dailyData.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-16 text-center text-slate-500">
                          暂无数据，点击右上角「补录数据」添加
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="py-16">
          <div className="text-center text-slate-500">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">请选择一个活动查看数据</p>
            <p className="text-sm mt-1">从右上角下拉菜单中选择活动</p>
          </div>
        </Card>
      )}

      <Modal
        isOpen={showActivityDetail}
        onClose={() => setShowActivityDetail(false)}
        title="活动详情"
        size="lg"
      >
        {selectedActivity && (
          <div className="space-y-6">
            <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{selectedActivity.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={statusColors[selectedActivity.status]}>
                    {statusLabels[selectedActivity.status]}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    {platformLabels[selectedActivity.platform as keyof typeof platformLabels] || selectedActivity.platform}
                  </span>
                </div>
              </div>
              <Calendar className="w-6 h-6 text-slate-400" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl">
                <p className="text-sm text-slate-500">活动时间</p>
                <p className="font-medium text-slate-800 mt-1">
                  {formatDateRange(selectedActivity.startTime, selectedActivity.endTime)}
                </p>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl">
                <p className="text-sm text-slate-500">参与商品</p>
                <p className="font-medium text-slate-800 mt-1">
                  {selectedActivity.productIds.length} 件
                </p>
              </div>
            </div>

            {selectedActivity.description && (
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500 mb-2">活动描述</p>
                <p className="text-slate-700">{selectedActivity.description}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-slate-700 mb-3">促销规则</p>
              <div className="space-y-2">
                {selectedActivity.promotionRules.map((rule, index) => (
                  <div key={rule.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-blue-700">
                      规则 {index + 1}: {rule.type === 'discount' && `打${100 - rule.discountValue}折`}
                      {rule.type === 'full_reduce' && `满${rule.threshold}减${rule.discountValue}`}
                      {rule.type === 'gift' && `买赠活动`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowActivityDetail(false)}>
                关闭
              </Button>
              <Button onClick={() => { setShowActivityDetail(false); setShowExportModal(true); }}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                导出复盘表
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="导出复盘报告"
        description="选择导出格式和内容范围"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">{selectedActivity?.name}</p>
                <p className="text-sm text-blue-600 mt-1">
                  将导出核心指标、每日明细和数据对比
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">导出格式</label>
            <Select defaultValue="xlsx">
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowExportModal(false)}>
              取消
            </Button>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              确认导出
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAddDataModal}
        onClose={() => setShowAddDataModal(false)}
        title="补录每日数据"
        description="添加或修改活动的每日运营数据"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">日期</label>
              <Input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              />
            </div>
            <div />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">访客数 (人)</label>
              <Input
                type="number"
                placeholder="请输入访客数"
                value={editForm.visitors}
                onChange={(e) => setEditForm({ ...editForm, visitors: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">订单数 (单)</label>
              <Input
                type="number"
                placeholder="请输入订单数"
                value={editForm.orders}
                onChange={(e) => setEditForm({ ...editForm, orders: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">成交额 (元)</label>
              <Input
                type="number"
                placeholder="请输入成交额"
                value={editForm.gmv}
                onChange={(e) => setEditForm({ ...editForm, gmv: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-600">
              <span className="font-medium">自动计算项：</span>
              转化率 {editForm.visitors > 0 ? ((editForm.orders / editForm.visitors) * 100).toFixed(2) : '0.00'}%，
              客单价 {editForm.orders > 0 ? formatCurrency(editForm.gmv / editForm.orders) : '-'}，
              利润和销售件数将根据公式自动推算
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddDataModal(false)}>
              <X className="w-4 h-4 mr-2" />
              取消
            </Button>
            <Button onClick={handleAddNewData}>
              <Check className="w-4 h-4 mr-2" />
              保存数据
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDayDetailModal}
        onClose={() => setShowDayDetailModal(false)}
        title={selectedCalendarDate ? `${selectedCalendarDate.getFullYear()}-${String(selectedCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(selectedCalendarDate.getDate()).padStart(2, '0')} 活动详情` : '活动详情'}
        description="当天进行中的活动及目标完成情况"
        size="lg"
      >
        <div className="space-y-3">
          {selectedCalendarDate && getActivitiesForDate(selectedCalendarDate, filteredCalendarActivities).length > 0 ? (
            getActivitiesForDate(selectedCalendarDate, filteredCalendarActivities).map((activity) => {
              const actDailyData = getActivityDailyData(activity.id);
              const dayStr = selectedCalendarDate.toISOString().slice(0, 10);
              const dayData = actDailyData.find((d) => d.date === dayStr);
              const hasTarget = activity.targetGmv || activity.targetOrders || activity.targetProfitMargin || activity.targetConversionRate;
              const activityShops = getActivityShops(activity.id);

              let metricStatus: { name: string; ok: boolean; value: string }[] = [];
              if (dayData && hasTarget) {
                const allDays = actDailyData.length;
                const expectedGmv = activity.targetGmv ? activity.targetGmv / Math.max(allDays, 1) : 0;
                const expectedOrders = activity.targetOrders ? activity.targetOrders / Math.max(allDays, 1) : 0;
                const dayProfitMargin = dayData.gmv > 0 ? (dayData.profit / dayData.gmv) * 100 : 0;

                if (activity.targetGmv) {
                  metricStatus.push({
                    name: '成交额',
                    ok: dayData.gmv >= expectedGmv * 0.6,
                    value: formatCurrency(dayData.gmv),
                  });
                }
                if (activity.targetOrders) {
                  metricStatus.push({
                    name: '订单数',
                    ok: dayData.orders >= expectedOrders * 0.6,
                    value: dayData.orders + ' 单',
                  });
                }
                if (activity.targetProfitMargin) {
                  metricStatus.push({
                    name: '毛利率',
                    ok: dayProfitMargin >= activity.targetProfitMargin * 0.6,
                    value: dayProfitMargin.toFixed(1) + '%',
                  });
                }
                if (activity.targetConversionRate) {
                  metricStatus.push({
                    name: '转化率',
                    ok: dayData.conversionRate >= activity.targetConversionRate * 0.6,
                    value: dayData.conversionRate.toFixed(2) + '%',
                  });
                }
              }

              const failedCount = metricStatus.filter(m => !m.ok).length;

              return (
                <div
                  key={activity.id}
                  className={cn(
                    'p-4 border rounded-xl hover:border-blue-300 cursor-pointer transition-all',
                    failedCount > 0 ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
                  )}
                  onClick={() => {
                    setSelectedActivityId(activity.id);
                    setShowDayDetailModal(false);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{activity.name}</span>
                      <Badge className={statusColors[activity.status]}>
                        {statusLabels[activity.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {failedCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3" />
                          {failedCount}项未达标
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {platformLabels[activity.platform as keyof typeof platformLabels] || activity.platform}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                    <span>{formatDateRange(activity.startTime, activity.endTime)}</span>
                    <span>{activity.productIds.length} 件商品</span>
                  </div>
                  {activityShops.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                      <Store className="w-3.5 h-3.5" />
                      <span>涉及店铺：</span>
                      <div className="flex flex-wrap gap-1">
                        {activityShops.map((shop) => (
                          <span key={shop.id} className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                            {shop.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {dayData && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3 border-t border-slate-100">
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-400">成交额</p>
                        <p className="font-medium text-slate-800">{formatCurrency(dayData.gmv)}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-400">订单数</p>
                        <p className="font-medium text-slate-800">{dayData.orders} 单</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-400">毛利率</p>
                        <p className="font-medium text-slate-800">
                          {dayData.gmv > 0 ? ((dayData.profit / dayData.gmv) * 100).toFixed(1) : '0'}%
                        </p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-400">转化率</p>
                        <p className="font-medium text-slate-800">{dayData.conversionRate.toFixed(2)}%</p>
                      </div>
                    </div>
                  )}

                  {metricStatus.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500 mb-2">目标完成情况</p>
                      <div className="flex flex-wrap gap-2">
                        {metricStatus.map((m, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs',
                              m.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            )}
                          >
                            {m.ok ? '✓' : '✗'} {m.name}: {m.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-slate-500">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p>当天没有进行中的活动</p>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowDayDetailModal(false)}>
              关闭
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
