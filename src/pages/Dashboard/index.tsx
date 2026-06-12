import { useState, useMemo } from 'react';
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
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { MetricCard } from '@/components/ui/MetricCard';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatPercentage } from '@/utils/price';
import { formatDate, formatDateRange, getCalendarDays, getMonthLabel, isToday, isCurrentMonth, getActivitiesForDate } from '@/utils/date';
import { exportDashboardReport } from '@/utils/export';
import { cn } from '@/lib/utils';
import { statusLabels, statusColors, platformLabels } from '@/types';
import type { Activity } from '@/types';

export default function Dashboard() {
  const {
    activities,
    products,
    activityData,
    getActivityById,
    getActivityDailyData,
    getActivitySummary,
  } = useAppStore();

  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    activities.find((a) => a.status === 'running')?.id || activities[0]?.id || null
  );
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [showActivityDetail, setShowActivityDetail] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const selectedActivity = selectedActivityId ? getActivityById(selectedActivityId) : null;
  const dailyData = selectedActivityId ? getActivityDailyData(selectedActivityId) : [];
  const summary = selectedActivityId ? getActivitySummary(selectedActivityId) : null;

  const calendarDays = useMemo(() => {
    return getCalendarDays(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const allActivities = activities;

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
                      const dayActivities = getActivitiesForDate(date, allActivities);
                      const hasActivity = dayActivities.length > 0;
                      const isTodayDate = isToday(date);
                      const inCurrentMonth = isCurrentMonth(date, currentYear, currentMonth);

                      return (
                        <div
                          key={index}
                          className={cn(
                            'h-10 flex items-center justify-center text-sm rounded-lg relative cursor-pointer transition-all',
                            !inCurrentMonth && 'text-slate-300',
                            isTodayDate && 'bg-blue-600 text-white font-bold',
                            hasActivity && !isTodayDate && 'bg-blue-100 text-blue-700 font-medium hover:bg-blue-200',
                            !hasActivity && !isTodayDate && inCurrentMonth && 'hover:bg-slate-100'
                          )}
                          title={hasActivity ? dayActivities.map((a) => a.name).join(', ') : ''}
                        >
                          {date.getDate()}
                          {hasActivity && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-2">本月活动</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">
                    {allActivities
                      .filter((a) => {
                        const start = new Date(a.startTime);
                        const end = new Date(a.endTime);
                        return (
                          (start.getFullYear() === currentYear && start.getMonth() === currentMonth) ||
                          (end.getFullYear() === currentYear && end.getMonth() === currentMonth)
                        );
                      })
                      .slice(0, 3)
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
              <CardTitle>每日明细</CardTitle>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {dailyData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-800">{row.date}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{row.visitors.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{row.orders.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-medium text-blue-600">{row.conversionRate.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(row.gmv)}</td>
                        <td className={cn('px-4 py-3 text-right font-medium', row.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                          {formatCurrency(row.profit)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">{row.unitsSold.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {row.orders > 0 ? formatCurrency(row.gmv / row.orders) : '-'}
                        </td>
                      </tr>
                    ))}
                    {dailyData.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-16 text-center text-slate-500">
                          暂无数据
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
    </div>
  );
}
