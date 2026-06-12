import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Filter,
  Search,
  Download,
  Clock,
  Ban,
  User,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, TextArea } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { MetricCard } from '@/components/ui/MetricCard';
import { formatCurrency } from '@/utils/price';
import { formatDate, formatDateRange, formatDateTime } from '@/utils/date';
import { exportSignupList } from '@/utils/export';
import { cn } from '@/lib/utils';
import {
  statusLabels,
  statusColors,
  riskLevelLabels,
  riskLevelColors,
  auditStatusLabels,
  auditStatusColors,
  auditTypeLabels,
  auditTypeColors,
  platformLabels,
} from '@/types';
import type { Activity, PriceCheckRecord } from '@/types';

export default function PriceCheck() {
  const navigate = useNavigate();
  const {
    activities,
    products,
    priceCheckRecords,
    runPriceCheck,
    approveActivity,
    rejectActivity,
    updatePriceCheckAudit,
    canApproveActivity,
    getActivityById,
    getActivityProducts,
    getActivityPriceChecks,
  } = useAppStore();

  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    activities.find((a) => a.status === 'pending')?.id || activities[0]?.id || null
  );
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [singleAuditTarget, setSingleAuditTarget] = useState<{ id: string; status: 'approved' | 'rejected'; remark?: string } | null>(null);
  const [singleAuditRemark, setSingleAuditRemark] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRunningCheck, setIsRunningCheck] = useState(false);

  const selectedActivity = selectedActivityId ? getActivityById(selectedActivityId) : null;
  const activityProducts = selectedActivityId ? getActivityProducts(selectedActivityId) : [];
  const activityChecks = selectedActivityId ? getActivityPriceChecks(selectedActivityId) : [];

  const pendingActivities = activities.filter((a) => a.status === 'pending' || a.status === 'draft');

  const filteredChecks = useMemo(() => {
    return activityChecks.filter((check) => {
      if (riskFilter !== 'all' && check.riskLevel !== riskFilter) return false;
      if (searchQuery) {
        const product = products.find((p) => p.id === check.productId);
        if (!product) return false;
        return product.name.includes(searchQuery) || product.sku.includes(searchQuery);
      }
      return true;
    });
  }, [activityChecks, riskFilter, searchQuery, products]);

  const stats = useMemo(() => {
    const total = activityChecks.length;
    const highRisk = activityChecks.filter((c) => c.riskLevel === 'high').length;
    const mediumRisk = activityChecks.filter((c) => c.riskLevel === 'medium').length;
    const lowRisk = activityChecks.filter((c) => c.riskLevel === 'low').length;
    const belowCost = activityChecks.filter((c) => c.belowCost).length;
    const couponRisk = activityChecks.filter((c) => c.couponRisk).length;
    const nearCostRisk = activityChecks.filter((c) => c.nearCostRisk).length;
    const approved = activityChecks.filter((c) => c.auditStatus === 'approved').length;
    const normalApproved = activityChecks.filter((c) => c.auditType === 'normal_approved').length;
    const remarkApproved = activityChecks.filter((c) => c.auditType === 'remark_approved').length;
    const rejected = activityChecks.filter((c) => c.auditStatus === 'rejected').length;
    const pending = activityChecks.filter((c) => c.auditStatus === 'pending').length;

    return { total, highRisk, mediumRisk, lowRisk, belowCost, couponRisk, nearCostRisk, approved, normalApproved, remarkApproved, rejected, pending };
  }, [activityChecks]);

  const handleRunCheck = async () => {
    if (!selectedActivityId) return;
    setIsRunningCheck(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    runPriceCheck(selectedActivityId);
    setIsRunningCheck(false);
  };

  const handleApprove = () => {
    if (!selectedActivityId) return;
    approveActivity(selectedActivityId);
    setShowApproveModal(false);
  };

  const handleReject = () => {
    if (!selectedActivityId || !rejectReason) return;
    rejectActivity(selectedActivityId, rejectReason);
    setShowRejectModal(false);
    setRejectReason('');
  };

  const handleExportSignupList = () => {
    if (!selectedActivity || !selectedActivityId) return;
    const checks = getActivityPriceChecks(selectedActivityId);
    exportSignupList(selectedActivity, products, checks);
  };

  const handleUpdateSingleAudit = (checkId: string, status: 'approved' | 'rejected') => {
    setSingleAuditTarget({ id: checkId, status });
    setSingleAuditRemark('');
  };

  const handleConfirmSingleAudit = () => {
    if (!singleAuditTarget) return;
    updatePriceCheckAudit(singleAuditTarget.id, singleAuditTarget.status, singleAuditRemark || undefined);
    setSingleAuditTarget(null);
    setSingleAuditRemark('');
  };

  const canApprove = selectedActivityId ? canApproveActivity(selectedActivityId) : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/activities')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回活动配置
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">价格校验</h1>
            <p className="text-slate-500 mt-1">检查活动价格风险，审核通过后生成报名清单</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard
          title="待审核商品"
          value={stats.total}
          suffix="件"
          icon={<ShieldCheck className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard
          title="高风险商品"
          value={stats.highRisk}
          suffix="件"
          change={stats.total > 0 ? -(stats.highRisk / stats.total) * 100 : 0}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
        />
        <MetricCard
          title="低于成本价"
          value={stats.belowCost}
          suffix="件"
          icon={<XCircle className="w-5 h-5" />}
          color="amber"
        />
        <MetricCard
          title="叠券风险"
          value={stats.couponRisk}
          suffix="件"
          icon={<Ban className="w-5 h-5" />}
          color="purple"
        />
        <MetricCard
          title="近成本线"
          value={stats.nearCostRisk}
          suffix="件"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>活动列表</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {pendingActivities.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">暂无待审核活动</p>
                </div>
              ) : (
                pendingActivities.map((activity) => (
                  <button
                    key={activity.id}
                    onClick={() => setSelectedActivityId(activity.id)}
                    className={cn(
                      'w-full p-4 text-left transition-all duration-200 border-l-4',
                      selectedActivityId === activity.id
                        ? 'bg-blue-50 border-blue-600'
                        : 'hover:bg-slate-50 border-transparent'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{activity.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDateRange(activity.startTime, activity.endTime)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={statusColors[activity.status]}>
                            {statusLabels[activity.status]}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {activity.productIds.length} 件商品
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          {selectedActivity ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <CardTitle>{selectedActivity.name}</CardTitle>
                        <Badge className={statusColors[selectedActivity.status]}>
                          {statusLabels[selectedActivity.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        {platformLabels[selectedActivity.platform as keyof typeof platformLabels] || selectedActivity.platform} · 
                        {formatDateRange(selectedActivity.startTime, selectedActivity.endTime)} ·
                        {activityProducts.length} 件商品
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="secondary"
                        onClick={handleRunCheck}
                        disabled={isRunningCheck}
                      >
                        <RefreshCw className={cn('w-4 h-4 mr-2', isRunningCheck && 'animate-spin')} />
                        {isRunningCheck ? '检测中...' : '重新检测'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleExportSignupList()}
                        disabled={selectedActivity.status !== 'approved'}
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        导出清单
                      </Button>
                      {selectedActivity.status === 'pending' && (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => setShowRejectModal(true)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            驳回
                          </Button>
                          <Button
                            onClick={() => setShowApproveModal(true)}
                            disabled={!canApprove}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            通过审核
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <p className="text-sm text-emerald-600">正常通过</p>
                      <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.normalApproved}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                      <p className="text-sm text-purple-600">备注放行</p>
                      <p className="text-2xl font-bold text-purple-700 mt-1">{stats.remarkApproved}</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-sm text-amber-600">待审核</p>
                      <p className="text-2xl font-bold text-amber-700 mt-1">{stats.pending}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                      <p className="text-sm text-red-600">已驳回</p>
                      <p className="text-2xl font-bold text-red-700 mt-1">{stats.rejected}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="搜索商品名称或 SKU"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                      className="w-full sm:w-40"
                    >
                      <option value="all">全部风险</option>
                      <option value="high">高风险</option>
                      <option value="medium">中风险</option>
                      <option value="low">低风险</option>
                    </Select>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>商品信息</TableHead>
                          <TableHead className="text-right">原价</TableHead>
                          <TableHead className="text-right">活动价</TableHead>
                          <TableHead className="text-right">到手价</TableHead>
                          <TableHead className="text-center">风险等级</TableHead>
                          <TableHead className="text-center">审核结果</TableHead>
                          <TableHead className="text-center">操作人/时间</TableHead>
                          <TableHead className="text-center">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredChecks.map((check) => {
                          const product = products.find((p) => p.id === check.productId);
                          if (!product) return null;

                          return (
                            <PriceCheckRow
                              key={check.id}
                              check={check}
                              product={product}
                              activityStatus={selectedActivity.status}
                              onApprove={() => handleUpdateSingleAudit(check.id, 'approved')}
                              onReject={() => handleUpdateSingleAudit(check.id, 'rejected')}
                            />
                          );
                        })}
                      </TableBody>
                    </Table>
                    {filteredChecks.length === 0 && (
                      <div className="py-16 text-center text-slate-500">
                        <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p>没有找到符合条件的校验记录</p>
                        <p className="text-sm mt-1">请先运行价格检测或调整筛选条件</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {activityChecks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>风险说明</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <span className="font-medium text-red-800">高风险</span>
                        </div>
                        <p className="text-sm text-red-600">
                          到手价低于成本价，或亏损比例超过 25%，建议调整促销规则或移除商品
                        </p>
                      </div>
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          <span className="font-medium text-amber-800">中风险</span>
                        </div>
                        <p className="text-sm text-amber-600">
                          活动价低于成本、叠加优惠券存在亏损风险，或毛利率低于 10% 接近成本线，需谨慎处理
                        </p>
                      </div>
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          <span className="font-medium text-emerald-800">低风险</span>
                        </div>
                        <p className="text-sm text-emerald-600">
                          价格在合理范围内，毛利充足，可正常参与活动
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="py-16">
              <div className="text-center text-slate-500">
                <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium">请选择一个活动进行价格校验</p>
                <p className="text-sm mt-1">从左侧活动列表中选择待审核的活动</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="通过审核"
        description="确认通过该活动的价格校验，审核通过后可导出报名清单"
        size="md"
      >
        <div className="space-y-4">
          {stats.remarkApproved > 0 && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-purple-800">
                    含 {stats.remarkApproved} 件备注放行商品
                  </p>
                  <p className="text-sm text-purple-600 mt-1">
                    部分高风险商品已通过备注放行，请注意后续监控价格和利润情况
                  </p>
                </div>
              </div>
            </div>
          )}
          {stats.pending > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">存在待审核商品</p>
                  <p className="text-sm text-amber-600 mt-1">
                    仍有 {stats.pending} 件商品待审核，建议先逐个处理后再整体通过
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="font-medium text-blue-800">{selectedActivity?.name}</p>
            <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
              <div>
                <span className="text-blue-500">正常通过</span>
                <span className="font-medium text-blue-800 ml-2">{stats.normalApproved} 件</span>
              </div>
              <div>
                <span className="text-purple-500">备注放行</span>
                <span className="font-medium text-purple-700 ml-2">{stats.remarkApproved} 件</span>
              </div>
              <div>
                <span className="text-amber-500">待审核</span>
                <span className="font-medium text-amber-700 ml-2">{stats.pending} 件</span>
              </div>
              <div>
                <span className="text-red-500">已驳回</span>
                <span className="font-medium text-red-700 ml-2">{stats.rejected} 件</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowApproveModal(false)}>
              取消
            </Button>
            <Button onClick={handleApprove} disabled={!canApprove}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              确认通过
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="驳回活动"
        description="请填写驳回原因，以便运营人员调整活动配置"
        size="md"
      >
        <div className="space-y-4">
          <TextArea
            label="驳回原因"
            placeholder="请详细说明驳回原因，如：部分商品价格低于成本价、促销规则需要调整等"
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowRejectModal(false)}>
              取消
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
            >
              <XCircle className="w-4 h-4 mr-2" />
              确认驳回
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!singleAuditTarget}
        onClose={() => setSingleAuditTarget(null)}
        title={singleAuditTarget?.status === 'approved' ? '通过商品审核' : '驳回商品'}
        description={singleAuditTarget?.status === 'approved' ? '确认通过该商品的价格校验' : '驳回该商品，请填写原因'}
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-500">
              当前商品审核状态将变为：
              <span className={cn(
                'font-medium ml-1',
                singleAuditTarget?.status === 'approved' ? 'text-emerald-600' : 'text-red-600'
              )}>
                {singleAuditTarget?.status === 'approved' ? '已通过' : '已驳回'}
              </span>
            </p>
            {singleAuditTarget?.status === 'approved' && (
              <p className="text-xs text-slate-400 mt-1">
                如有风险但确认放行，请在备注中说明
              </p>
            )}
          </div>
          <TextArea
            label={singleAuditTarget?.status === 'approved' ? '备注（选填，如备注放行原因）' : '驳回原因'}
            placeholder={
              singleAuditTarget?.status === 'approved'
                ? '如：风险可控，备注放行'
                : '请填写驳回原因'
            }
            rows={3}
            value={singleAuditRemark}
            onChange={(e) => setSingleAuditRemark(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setSingleAuditTarget(null)}>
              取消
            </Button>
            <Button
              variant={singleAuditTarget?.status === 'approved' ? 'primary' : 'danger'}
              onClick={handleConfirmSingleAudit}
              disabled={singleAuditTarget?.status === 'rejected' && !singleAuditRemark.trim()}
            >
              {singleAuditTarget?.status === 'approved' ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" />确认通过</>
              ) : (
                <><XCircle className="w-4 h-4 mr-2" />确认驳回</>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface PriceCheckRowProps {
  check: PriceCheckRecord;
  product: any;
  activityStatus: Activity['status'];
  onApprove: () => void;
  onReject: () => void;
}

function PriceCheckRow({ check, product, activityStatus, onApprove, onReject }: PriceCheckRowProps) {
  const [showDetail, setShowDetail] = useState(false);

  const riskTypes = [];
  if (check.belowCost) riskTypes.push('低于成本');
  if (check.couponRisk) riskTypes.push('叠券风险');
  if (check.nearCostRisk) riskTypes.push('近成本线');
  if (riskTypes.length === 0) riskTypes.push('正常');

  const displayAuditType = check.auditType || (check.auditStatus === 'approved' ? 'normal_approved' : check.auditStatus === 'rejected' ? 'rejected' : 'pending');

  return (
    <>
      <TableRow className={cn(check.riskLevel === 'high' && 'bg-red-50/30')}>
        <TableCell>
          <div className="flex items-center gap-3">
            <img
              src={product.image}
              alt={product.name}
              className="w-10 h-10 rounded-lg object-cover bg-slate-100"
            />
            <div>
              <p className="font-medium text-slate-800">{product.name}</p>
              <p className="text-xs text-slate-500">{product.sku}</p>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-right text-slate-600">
          {formatCurrency(check.originalPrice)}
        </TableCell>
        <TableCell className="text-right font-medium text-blue-600">
          {formatCurrency(check.activityPrice)}
        </TableCell>
        <TableCell className="text-right font-bold text-amber-600">
          {formatCurrency(check.finalPrice)}
        </TableCell>
        <TableCell className="text-center">
          <Badge className={riskLevelColors[check.riskLevel]}>
            {riskLevelLabels[check.riskLevel]}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          <div className="flex flex-col items-center gap-1">
            <Badge className={auditTypeColors[displayAuditType as keyof typeof auditTypeColors]}>
              {auditTypeLabels[displayAuditType as keyof typeof auditTypeLabels]}
            </Badge>
            {check.auditRemark && (
              <span className="text-xs text-slate-500 max-w-[140px] truncate" title={check.auditRemark}>
                备注: {check.auditRemark}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center">
          {check.auditedAt ? (
            <div className="flex flex-col items-center gap-0.5 text-xs">
              <div className="flex items-center gap-1 text-slate-600">
                <User className="w-3 h-3" />
                <span>{check.auditor || '-'}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3 h-3" />
                <span>{formatDateTime(check.auditedAt)}</span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          )}
        </TableCell>
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setShowDetail(true)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              title="查看详情"
            >
              <Eye className="w-4 h-4 text-slate-500" />
            </button>
            {activityStatus === 'pending' && check.auditStatus === 'pending' && (
              <>
                <button
                  onClick={onApprove}
                  className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="通过"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </button>
                <button
                  onClick={onReject}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                  title="驳回"
                >
                  <XCircle className="w-4 h-4 text-red-500" />
                </button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>

      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="商品价格详情"
        size="md"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <img
              src={product.image}
              alt={product.name}
              className="w-20 h-20 rounded-xl object-cover bg-white"
            />
            <div>
              <p className="font-medium text-slate-800 text-lg">{product.name}</p>
              <p className="text-sm text-slate-500">{product.sku} · {product.category}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={riskLevelColors[check.riskLevel]}>
                  {riskLevelLabels[check.riskLevel]}
                </Badge>
                <Badge className={auditStatusColors[check.auditStatus]}>
                  {auditStatusLabels[check.auditStatus]}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-slate-200 rounded-xl">
              <p className="text-sm text-slate-500">成本价</p>
              <p className="text-xl font-bold text-slate-800 mt-1">
                {formatCurrency(product.costPrice)}
              </p>
            </div>
            <div className="p-4 border border-slate-200 rounded-xl">
              <p className="text-sm text-slate-500">原价</p>
              <p className="text-xl font-bold text-slate-800 mt-1">
                {formatCurrency(check.originalPrice)}
              </p>
            </div>
            <div className="p-4 border border-blue-200 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-600">活动价</p>
              <p className="text-xl font-bold text-blue-600 mt-1">
                {formatCurrency(check.activityPrice)}
              </p>
              <p className="text-xs text-blue-500 mt-1">
                优惠 {formatCurrency(check.originalPrice - check.activityPrice)}
              </p>
            </div>
            <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl">
              <p className="text-sm text-amber-600">预计到手价</p>
              <p className="text-xl font-bold text-amber-600 mt-1">
                {formatCurrency(check.finalPrice)}
              </p>
              <p className="text-xs text-amber-500 mt-1">
                {check.shopCouponAmount > 0 && `含店铺券 ¥${check.shopCouponAmount}`}
                {check.shopCouponAmount > 0 && check.platformCouponAmount > 0 && ' + '}
                {check.platformCouponAmount > 0 && `平台券 ¥${check.platformCouponAmount}`}
                {check.shopCouponAmount === 0 && check.platformCouponAmount === 0 && '暂无优惠券'}
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-sm font-medium text-slate-700 mb-3">利润分析</p>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">预估利润</span>
              <span className={cn(
                'font-bold',
                check.finalPrice - product.costPrice >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {formatCurrency(check.finalPrice - product.costPrice)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-slate-600">毛利率</span>
              <span className={cn(
                'font-medium',
                ((check.finalPrice - product.costPrice) / check.finalPrice) * 100 >= 20 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {(((check.finalPrice - product.costPrice) / check.finalPrice) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {check.riskLevel !== 'low' && (
            <div className={cn(
              'p-4 border rounded-xl',
              check.riskLevel === 'high' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
            )}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={cn(
                  'w-5 h-5 flex-shrink-0 mt-0.5',
                  check.riskLevel === 'high' ? 'text-red-500' : 'text-amber-500'
                )} />
                <div>
                  <p className={cn(
                    'font-medium',
                    check.riskLevel === 'high' ? 'text-red-800' : 'text-amber-800'
                  )}>
                    {check.riskLevel === 'high' ? '高风险提示' : '中风险提示'}
                  </p>
                  <p className={cn(
                    'text-sm mt-1',
                    check.riskLevel === 'high' ? 'text-red-600' : 'text-amber-600'
                  )}>
                    {check.riskDescription}
                  </p>
                  <p className={cn(
                    'text-sm mt-2',
                    check.riskLevel === 'high' ? 'text-red-600' : 'text-amber-600'
                  )}>
                    建议：调整促销规则、提高活动价格或移除该商品
                  </p>
                </div>
              </div>
            </div>
          )}
          {check.riskLevel === 'low' && check.riskDescription && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-emerald-800">价格正常</p>
                  <p className="text-sm text-emerald-600 mt-1">
                    {check.riskDescription}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
