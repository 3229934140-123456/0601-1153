import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Gift,
  Percent,
  Tag as TagIcon,
  Calendar,
  Store,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Save,
  Send,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, TextArea } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { calculateActivityPrice, calculateFinalPrice, formatCurrency } from '@/utils/price';
import { formatDate } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { PromotionRule, Activity } from '@/types';

export default function ActivityConfig() {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    shops,
    products,
    activities,
    selectedProductIds,
    createActivity,
    updateActivity,
    updateActivityRules,
    submitActivityForReview,
    getActivityById,
    getActivityProducts,
  } = useAppStore();

  const editingActivity = id ? getActivityById(id) : null;
  const isEditing = !!editingActivity;

  const [activityName, setActivityName] = useState(editingActivity?.name || '');
  const [activityType, setActivityType] = useState<Activity['type']>(editingActivity?.type || 'discount');
  const [startDate, setStartDate] = useState(editingActivity ? formatDate(editingActivity.startTime, 'yyyy-MM-dd') : '');
  const [endDate, setEndDate] = useState(editingActivity ? formatDate(editingActivity.endTime, 'yyyy-MM-dd') : '');
  const [platform, setPlatform] = useState(editingActivity?.platform || '');
  const [description, setDescription] = useState(editingActivity?.description || '');
  const [rules, setRules] = useState<PromotionRule[]>(editingActivity?.promotionRules || []);
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const activityProducts = useMemo(() => {
    if (isEditing && editingActivity) {
      return getActivityProducts(editingActivity.id);
    }
    return products.filter((p) => selectedProductIds.includes(p.id));
  }, [isEditing, editingActivity, products, selectedProductIds, getActivityProducts]);

  useEffect(() => {
    if (activityProducts.length === 0 && !isEditing) {
      navigate('/products');
    }
  }, [activityProducts.length, isEditing, navigate]);

  const addRule = () => {
    const newRule: PromotionRule = {
      id: `rule-${Date.now()}`,
      type: activityType === 'full_reduce' ? 'full_reduce' : activityType === 'gift' ? 'gift' : 'discount',
      discountType: activityType === 'full_reduce' ? 'fixed' : 'percentage',
      discountValue: 0,
      priority: rules.length + 1,
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (ruleId: string, updates: Partial<PromotionRule>) => {
    setRules(rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)));
  };

  const removeRule = (ruleId: string) => {
    setRules(rules.filter((r) => r.id !== ruleId));
  };

  const handleSave = (submitForReview: boolean = false) => {
    const activityData = {
      name: activityName,
      type: activityType,
      startTime: new Date(startDate).toISOString(),
      endTime: new Date(endDate).toISOString(),
      platform,
      status: (submitForReview ? 'pending' : 'draft') as Activity['status'],
      productIds: isEditing && editingActivity ? editingActivity.productIds : selectedProductIds,
      promotionRules: rules,
      description,
    };

    if (isEditing && editingActivity) {
      updateActivity(editingActivity.id, activityData);
      updateActivityRules(editingActivity.id, rules);
      if (submitForReview) {
        submitActivityForReview(editingActivity.id);
      }
    } else {
      const newActivity = createActivity(activityData);
      updateActivityRules(newActivity.id, rules);
      if (submitForReview) {
        submitActivityForReview(newActivity.id);
      }
    }

    setShowSaveModal(false);
    navigate('/price-check');
  };

  const previewData = useMemo(() => {
    return activityProducts.map((product) => {
      const activityPrice = calculateActivityPrice(product.salePrice, rules);
      const finalPrice = calculateFinalPrice(activityPrice);
      const discountAmount = product.salePrice - activityPrice;
      const discountPercent = ((product.salePrice - activityPrice) / product.salePrice) * 100;
      const estimatedProfit = finalPrice - product.costPrice;
      const profitMargin = finalPrice > 0 ? (estimatedProfit / finalPrice) * 100 : 0;
      const hasRisk = finalPrice < product.costPrice;

      return {
        product,
        activityPrice,
        finalPrice,
        discountAmount,
        discountPercent,
        estimatedProfit,
        profitMargin,
        hasRisk,
      };
    });
  }, [activityProducts, rules]);

  const totalDiscount = previewData.reduce((sum, p) => sum + p.discountAmount, 0);
  const riskyCount = previewData.filter((p) => p.hasRisk).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/products')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回商品池
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isEditing ? '编辑活动' : '创建活动'}
            </h1>
            <p className="text-slate-500 mt-1">
              已选 {activityProducts.length} 件商品参与活动
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="w-4 h-4 mr-2" />
            预览活动价
          </Button>
          <Button variant="secondary" onClick={() => setShowSaveModal(true)}>
            <Save className="w-4 h-4 mr-2" />
            保存草稿
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={!activityName || !startDate || !endDate || !platform || rules.length === 0}
          >
            <Send className="w-4 h-4 mr-2" />
            提交审核
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>活动基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="活动名称"
                  placeholder="请输入活动名称"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                />
                <Select
                  label="活动类型"
                  value={activityType}
                  onChange={(e) => {
                    setActivityType(e.target.value as Activity['type']);
                    setRules([]);
                  }}
                >
                  <option value="discount">折扣活动</option>
                  <option value="full_reduce">满减活动</option>
                  <option value="gift">买赠活动</option>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">活动开始时间</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">活动结束时间</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="适用平台"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  <option value="">请选择平台</option>
                  {shops.map((shop) => (
                    <option key={shop.platform} value={shop.platform}>
                      {shop.platform === 'taobao' ? '淘宝' : shop.platform === 'jd' ? '京东' : shop.platform === 'pdd' ? '拼多多' : '抖音'}
                    </option>
                  ))}
                </Select>
                <div className="flex items-end">
                  <Select
                    label="优惠叠加"
                    defaultValue="allow"
                  >
                    <option value="allow">允许叠加店铺券</option>
                    <option value="partial">部分叠加</option>
                    <option value="none">不允许叠加</option>
                  </Select>
                </div>
              </div>
              <TextArea
                label="活动描述"
                placeholder="请输入活动描述，用于内部备注"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>促销规则配置</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    {activityType === 'discount' && '设置商品折扣率，如 85 折即输入 15'}
                    {activityType === 'full_reduce' && '设置满减档位，如满 200 减 30'}
                    {activityType === 'gift' && '设置买赠条件和赠品信息'}
                  </p>
                </div>
                <Button onClick={addRule} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  添加规则
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {rules.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  {activityType === 'discount' && <Percent className="w-12 h-12 mx-auto mb-4 text-slate-300" />}
                  {activityType === 'full_reduce' && <TagIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />}
                  {activityType === 'gift' && <Gift className="w-12 h-12 mx-auto mb-4 text-slate-300" />}
                  <p>还没有配置任何促销规则</p>
                  <p className="text-sm mt-1">点击上方「添加规则」按钮开始配置</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule, index) => (
                    <RuleEditor
                      key={rule.id}
                      rule={rule}
                      index={index}
                      activityType={activityType}
                      products={products}
                      onUpdate={(updates) => updateRule(rule.id, updates)}
                      onRemove={() => removeRule(rule.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>活动概览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">参与商品</span>
                <span className="font-medium text-slate-800">{activityProducts.length} 件</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">规则数量</span>
                <span className="font-medium text-slate-800">{rules.length} 条</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">预估优惠总额</span>
                <span className="font-medium text-amber-600">{formatCurrency(totalDiscount)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">风险商品</span>
                  {riskyCount > 0 && (
                    <Badge variant="danger">{riskyCount} 件</Badge>
                  )}
                </div>
                <span className={`font-medium ${riskyCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {riskyCount > 0 ? '存在风险' : '暂无风险'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>参与商品</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                {activityProducts.slice(0, 8).map((product) => (
                  <div key={product.id} className="flex items-center gap-3 p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.sku}</p>
                    </div>
                    <span className="text-sm font-medium text-slate-800">
                      {formatCurrency(product.salePrice)}
                    </span>
                  </div>
                ))}
                {activityProducts.length > 8 && (
                  <div className="p-3 text-center text-sm text-slate-500">
                    还有 {activityProducts.length - 8} 件商品...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="活动价格预览"
        description="预览所有商品的活动价、优惠幅度和预估利润"
        size="xl"
      >
        <div className="space-y-4">
          {riskyCount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">发现 {riskyCount} 件商品存在价格风险</p>
                <p className="text-sm text-red-600 mt-1">活动价低于成本价，建议调整促销规则或移除相关商品</p>
              </div>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品信息</TableHead>
                <TableHead className="text-right">原价</TableHead>
                <TableHead className="text-right">活动价</TableHead>
                <TableHead className="text-right">优惠金额</TableHead>
                <TableHead className="text-right">到手价</TableHead>
                <TableHead className="text-right">成本价</TableHead>
                <TableHead className="text-right">预估利润</TableHead>
                <TableHead className="text-center">风险</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.map((item) => (
                <TableRow key={item.product.id} className={cn(item.hasRisk && 'bg-red-50/50')}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                      />
                      <div>
                        <p className="font-medium text-slate-800">{item.product.name}</p>
                        <p className="text-xs text-slate-500">{item.product.sku}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-slate-600">
                    {formatCurrency(item.product.salePrice)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-blue-600">
                    {formatCurrency(item.activityPrice)}
                  </TableCell>
                  <TableCell className="text-right text-emerald-600">
                    -{formatCurrency(item.discountAmount)}
                    <span className="text-xs ml-1">({item.discountPercent.toFixed(1)}%)</span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-amber-600">
                    {formatCurrency(item.finalPrice)}
                  </TableCell>
                  <TableCell className="text-right text-slate-600">
                    {formatCurrency(item.product.costPrice)}
                  </TableCell>
                  <TableCell className={cn(
                    'text-right font-medium',
                    item.estimatedProfit < 0 ? 'text-red-600' : 'text-emerald-600'
                  )}>
                    {formatCurrency(item.estimatedProfit)}
                    <span className="text-xs ml-1">({item.profitMargin.toFixed(1)}%)</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.hasRisk ? (
                      <Badge variant="danger">低于成本</Badge>
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Modal>

      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="保存活动草稿"
        description="活动将保存为草稿状态，可后续继续编辑"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Store className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">即将保存活动</p>
                <p className="text-sm text-blue-600 mt-1">
                  活动名称: {activityName || '未命名活动'}
                </p>
                <p className="text-sm text-blue-600">
                  商品数量: {activityProducts.length} 件
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowSaveModal(false)}>
              <X className="w-4 h-4 mr-2" />
              取消
            </Button>
            <Button onClick={() => handleSave(false)}>
              <Save className="w-4 h-4 mr-2" />
              保存草稿
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface RuleEditorProps {
  rule: PromotionRule;
  index: number;
  activityType: Activity['type'];
  products: any[];
  onUpdate: (updates: Partial<PromotionRule>) => void;
  onRemove: () => void;
}

function RuleEditor({ rule, index, activityType, products, onUpdate, onRemove }: RuleEditorProps) {
  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
            {index + 1}
          </span>
          <span className="font-medium text-slate-800">
            {activityType === 'discount' && '折扣规则'}
            {activityType === 'full_reduce' && `满减档位 ${index + 1}`}
            {activityType === 'gift' && '买赠规则'}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>

      {activityType === 'discount' && (
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">折扣率 (%)</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">立减</span>
              <Input
                type="number"
                placeholder="15"
                value={rule.discountValue || ''}
                onChange={(e) => onUpdate({ discountValue: Number(e.target.value) })}
                className="w-24"
              />
              <span className="text-slate-500">%</span>
            </div>
          </div>
        </div>
      )}

      {activityType === 'full_reduce' && (
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">满 (元)</label>
            <Input
              type="number"
              placeholder="200"
              value={rule.threshold || ''}
              onChange={(e) => onUpdate({ threshold: Number(e.target.value) })}
            />
          </div>
          <div className="text-2xl text-slate-400">→</div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">减 (元)</label>
            <Input
              type="number"
              placeholder="30"
              value={rule.discountValue || ''}
              onChange={(e) => onUpdate({ discountValue: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {activityType === 'gift' && (
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="赠品商品"
            value={rule.giftProductId || ''}
            onChange={(e) => onUpdate({ giftProductId: e.target.value })}
          >
            <option value="">请选择赠品</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Input
            type="number"
            label="赠送数量"
            placeholder="1"
            value={rule.giftQuantity || ''}
            onChange={(e) => onUpdate({ giftQuantity: Number(e.target.value) })}
          />
        </div>
      )}
    </div>
  );
}
