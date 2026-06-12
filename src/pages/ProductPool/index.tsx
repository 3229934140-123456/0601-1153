import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Search,
  Filter,
  Upload,
  Plus,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Store,
  Tag,
  PackageOpen,
  TrendingUp,
  DollarSign,
  X,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  Check,
  Download,
  ArrowRight,
  History,
  RotateCcw,
  FileUp,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/utils/price';
import { formatDate } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { Product, ImportedProductRow, ImportBatch } from '@/types';

interface ImportPreviewItem {
  row: ImportedProductRow;
  errors: string[];
  isValid: boolean;
  mappedRow: Record<string, any>;
}

const FIELD_OPTIONS = [
  { value: 'sku', label: 'SKU' },
  { value: 'name', label: '商品名称' },
  { value: 'category', label: '类目' },
  { value: 'costPrice', label: '成本价' },
  { value: 'salePrice', label: '售价' },
  { value: 'stock', label: '库存' },
  { value: '_skip', label: '跳过该列' },
];

const FIELD_AUTO_MATCH: Record<string, string[]> = {
  sku: ['sku', 'SKU', '商品SKU', '编码', '货号'],
  name: ['name', '商品名称', '名称', '商品名', '品名', '标题'],
  category: ['category', '类目', '分类', '品类', '商品类目'],
  costPrice: ['costPrice', '成本价', '成本', '进价', 'cost_price', '采购价'],
  salePrice: ['salePrice', '售价', '价格', 'sale_price', '销售价', '零售价', '标价'],
  stock: ['stock', '库存', '库存量', '数量', '可售库存'],
};

export default function ProductPool() {
  const navigate = useNavigate();
  const {
    shops,
    products,
    importBatches,
    selectedProductIds,
    currentFilter,
    setFilter,
    toggleProductSelection,
    selectAllProducts,
    clearSelectedProducts,
    getFilteredProducts,
    addProducts,
    importProductsFromShop,
    createImportBatch,
    updateImportBatch,
    rollbackImportBatch,
  } = useAppStore();

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<ImportBatch | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'preview' | 'success'>('upload');
  const [importShopId, setImportShopId] = useState('');
  const [previewData, setPreviewData] = useState<ImportPreviewItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [headerMapping, setHeaderMapping] = useState<Record<string, string>>({});
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(() => {
    setFilter({
      search: searchQuery || undefined,
      shopId: selectedShop || undefined,
      category: selectedCategory || undefined,
    });
    return getFilteredProducts();
  }, [searchQuery, selectedShop, selectedCategory, getFilteredProducts, setFilter]);

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const allSelected = filteredProducts.length > 0 && filteredProducts.every((p) => selectedProductIds.includes(p.id));
  const someSelected = filteredProducts.some((p) => selectedProductIds.includes(p.id)) && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelectedProducts();
    } else {
      selectAllProducts(filteredProducts.map((p) => p.id));
    }
  };

  const handleCreateActivity = () => {
    if (selectedProductIds.length === 0) return;
    navigate('/activities');
  };

  const handleDownloadTemplate = () => {
    const headers = ['SKU', '商品名称', '类目', '成本价', '售价', '库存'];
    const sampleRows = [
      ['SKU001', '示例商品A', '服饰', 50, 99, 200],
      ['SKU002', '示例商品B', '数码', 120, 259, 150],
      ['SKU003', '示例商品C', '美妆', 30, 79, 300],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '商品导入模板');
    XLSX.writeFile(wb, '商品导入模板.xlsx');
  };

  const autoMatchHeader = (header: string): string => {
    const lower = header.trim().toLowerCase();
    for (const [field, keywords] of Object.entries(FIELD_AUTO_MATCH)) {
      if (keywords.some((kw) => kw.toLowerCase() === lower || lower.includes(kw.toLowerCase()))) {
        return field;
      }
    }
    return '_skip';
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

        if (json.length === 0) {
          alert('文件中没有数据');
          return;
        }

        const headers = Object.keys(json[0]);
        const initialMapping: Record<string, string> = {};
        headers.forEach((h) => {
          initialMapping[h] = autoMatchHeader(h);
        });

        setRawHeaders(headers);
        setHeaderMapping(initialMapping);
        setRawRows(json);
        setImportStep('mapping');
      } catch (err) {
        alert('文件解析失败，请检查文件格式');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleMappingNext = () => {
    const mappedFields = Object.values(headerMapping).filter((v) => v !== '_skip');
    if (!mappedFields.includes('name') && !mappedFields.includes('salePrice')) {
      alert('请至少映射「商品名称」和「售价」两列');
      return;
    }

    const preview: ImportPreviewItem[] = rawRows.map((row) => {
      const mapped: Record<string, any> = {};
      for (const [header, field] of Object.entries(headerMapping)) {
        if (field !== '_skip') {
          mapped[field] = row[header];
        }
      }

      const errors: string[] = [];
      if (!mapped.name) errors.push('缺少商品名称');
      const price = Number(mapped.salePrice);
      const cost = Number(mapped.costPrice);
      if (isNaN(price) || price <= 0) errors.push('售价无效');
      if (mapped.costPrice !== undefined && (isNaN(cost) || cost <= 0)) errors.push('成本价无效');
      if (!isNaN(price) && !isNaN(cost) && cost > price) errors.push('成本价高于售价');

      return {
        row: mapped as ImportedProductRow,
        errors,
        isValid: errors.length === 0,
        mappedRow: mapped,
      };
    });

    setPreviewData(preview);
    setImportStep('preview');
  };

  const handleConfirmImport = () => {
    if (!importShopId) {
      alert('请选择导入的店铺');
      return;
    }

    const validItems = previewData.filter((p) => p.isValid);
    const invalidItems = previewData.filter((p) => !p.isValid);
    if (validItems.length === 0) {
      alert('没有可导入的有效商品数据');
      return;
    }

    const failReasons = Array.from(new Set(invalidItems.flatMap((i) => i.errors)));

    const batch = createImportBatch({
      sourceType: 'file',
      sourceName: 'Excel文件导入',
      shopId: importShopId,
      totalCount: previewData.length,
      successCount: validItems.length,
      failCount: invalidItems.length,
      failReasons,
      productIds: [],
    });

    const newProducts = validItems.map((item) => {
      const r = item.mappedRow;
      const salePrice = Number(r.salePrice) || 0;
      const costPrice = Number(r.costPrice) || 0;
      return {
        sku: String(r.sku || `SKU${Date.now()}`),
        name: String(r.name || '未命名商品'),
        category: String(r.category || '其他'),
        costPrice,
        salePrice,
        stock: Number(r.stock || 100),
        margin: salePrice > 0 ? Math.round(((salePrice - costPrice) / salePrice) * 100) : 0,
        shopId: importShopId,
        image: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ecommerce%20product&image_size=square`,
      };
    });

    const added = addProducts(newProducts, batch.id);
    updateImportBatch(batch.id, { productIds: added.map((p) => p.id) });

    setImportedCount(newProducts.length);
    setImportStep('success');
  };

  const handleShopSync = async (shopId: string) => {
    setIsSyncing(shopId);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const { products: imported } = importProductsFromShop(shopId, 10);
    setIsSyncing(null);
    setImportedCount(imported.length);
    setImportStep('success');
    setShowImportModal(true);
  };

  const resetImportModal = () => {
    setImportStep('upload');
    setPreviewData([]);
    setImportShopId('');
    setImportedCount(0);
    setRawHeaders([]);
    setHeaderMapping({});
    setRawRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setTimeout(resetImportModal, 300);
  };

  const getStockBadge = (stock: number) => {
    if (stock < 100) return <Badge variant="danger">库存紧张</Badge>;
    if (stock < 500) return <Badge variant="warning">库存偏低</Badge>;
    return <Badge variant="success">库存充足</Badge>;
  };

  const getMarginBadge = (margin: number) => {
    if (margin < 20) return <Badge variant="danger">{margin}%</Badge>;
    if (margin < 40) return <Badge variant="warning">{margin}%</Badge>;
    return <Badge variant="success">{margin}%</Badge>;
  };

  const mappedFieldLabel = (field: string) => {
    const opt = FIELD_OPTIONS.find((o) => o.value === field);
    return opt ? opt.label : field;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">商品池</h1>
          <p className="text-slate-500 mt-1">管理店铺商品，筛选优质品参与促销活动</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setShowBatchModal(true)}>
            <History className="w-4 h-4 mr-2" />
            导入记录
          </Button>
          <Button variant="secondary" onClick={() => { resetImportModal(); setShowImportModal(true); }}>
            <Upload className="w-4 h-4 mr-2" />
            导入商品
          </Button>
          <Button
            onClick={handleCreateActivity}
            disabled={selectedProductIds.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            加入活动 ({selectedProductIds.length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <PackageOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">商品总数</p>
              <p className="text-xl font-bold text-slate-800">{products.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">已选商品</p>
              <p className="text-xl font-bold text-slate-800">{selectedProductIds.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">高毛利品</p>
              <p className="text-xl font-bold text-slate-800">
                {products.filter((p) => p.margin >= 40).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">低库存品</p>
              <p className="text-xl font-bold text-slate-800">
                {products.filter((p) => p.stock < 100).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="搜索商品名称或 SKU"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="ghost" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4 mr-2" />
                筛选
                <ChevronDown className={cn('w-4 h-4 ml-1 transition-transform', showFilters && 'rotate-180')} />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">共 {filteredProducts.length} 件商品</span>
              {someSelected && (
                <Badge variant="info">已选 {selectedProductIds.length} 件</Badge>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Select
                label="店铺"
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
              >
                <option value="">全部店铺</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </Select>
              <Select
                label="类目"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">全部类目</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">库存范围</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="最小"
                    onChange={(e) => setFilter({ minStock: e.target.value ? Number(e.target.value) : undefined })}
                  />
                  <Input
                    type="number"
                    placeholder="最大"
                    onChange={(e) => setFilter({ maxStock: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">毛利率范围 (%)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="最小"
                    onChange={(e) => setFilter({ minMargin: e.target.value ? Number(e.target.value) : undefined })}
                  />
                  <Input
                    type="number"
                    placeholder="最大"
                    onChange={(e) => setFilter({ maxMargin: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => el && (el.indeterminate = someSelected)}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </TableHead>
                <TableHead>商品信息</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <Store className="w-3 h-3" />
                    店铺
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    类目
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <DollarSign className="w-3 h-3" />
                    售价
                  </div>
                </TableHead>
                <TableHead className="text-right">成本价</TableHead>
                <TableHead className="text-right">毛利率</TableHead>
                <TableHead className="text-right">库存</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  shopName={shops.find((s) => s.id === product.shopId)?.name || '-'}
                  isSelected={selectedProductIds.includes(product.id)}
                  onToggle={() => toggleProductSelection(product.id)}
                  getStockBadge={getStockBadge}
                  getMarginBadge={getMarginBadge}
                />
              ))}
            </TableBody>
          </Table>
          {filteredProducts.length === 0 && (
            <div className="py-16 text-center text-slate-500">
              <PackageOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>没有找到符合条件的商品</p>
              <p className="text-sm mt-1">请尝试调整筛选条件或导入新商品</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProductIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 ml-32 bg-white rounded-xl shadow-2xl border border-slate-200 px-6 py-4 flex items-center justify-between gap-6 z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800">已选择 {selectedProductIds.length} 件商品</p>
              <p className="text-sm text-slate-500">
                预估优惠额: {formatCurrency(selectedProductIds.length * 50)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={clearSelectedProducts}>
              取消选择
            </Button>
            <Button onClick={handleCreateActivity}>
              创建活动
              <Plus className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={showImportModal}
        onClose={closeImportModal}
        title={
          importStep === 'success' ? '导入成功' :
          importStep === 'mapping' ? '匹配表头' :
          importStep === 'preview' ? '数据预览' :
          '导入商品'
        }
        description={
          importStep === 'success'
            ? '商品已成功导入到商品池'
            : importStep === 'mapping'
            ? '将 Excel 列名映射到系统字段，确认后预览数据'
            : '支持 Excel 批量导入或从店铺同步商品数据'
        }
        size={importStep === 'preview' || importStep === 'mapping' ? 'xl' : 'md'}
      >
        {importStep === 'upload' && (
          <div className="space-y-6">
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="font-medium text-slate-700">点击或拖拽文件到此处上传</p>
              <p className="text-sm text-slate-500 mt-1">支持 .xlsx, .xls 格式，最大 10MB</p>
              <Button className="mt-4" variant="outline">
                选择文件
              </Button>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                下载导入模板
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-sm text-slate-500">或</span>
              </div>
            </div>
            <div className="space-y-3">
              <p className="font-medium text-slate-700">从店铺同步</p>
              {shops.map((shop) => (
                <div
                  key={shop.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Store className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{shop.name}</p>
                      <p className="text-sm text-slate-500">{shop.platform}</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isSyncing === shop.id}
                    onClick={() => handleShopSync(shop.id)}
                  >
                    {isSyncing === shop.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        同步中...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        同步商品
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {importStep === 'mapping' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-800">
                    已识别 {rawHeaders.length} 列、{rawRows.length} 行数据
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    请确认系统自动匹配的字段是否正确，可手动调整
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-2 gap-px bg-slate-200">
                <div className="bg-slate-50 px-4 py-3 font-semibold text-sm text-slate-700">Excel 列名</div>
                <div className="bg-slate-50 px-4 py-3 font-semibold text-sm text-slate-700">映射到系统字段</div>
              </div>
              {rawHeaders.map((header) => (
                <div key={header} className="grid grid-cols-2 gap-px bg-slate-200">
                  <div className="bg-white px-4 py-3 flex items-center gap-2">
                    <span className="text-sm text-slate-800 font-medium">{header}</span>
                    <span className="text-xs text-slate-400">
                      示例: {String(rawRows[0]?.[header] ?? '-').slice(0, 20)}
                    </span>
                  </div>
                  <div className="bg-white px-4 py-3">
                    <Select
                      value={headerMapping[header] || '_skip'}
                      onChange={(e) => setHeaderMapping({ ...headerMapping, [header]: e.target.value })}
                    >
                      {FIELD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setImportStep('upload')}>
                <X className="w-4 h-4 mr-2" />
                返回上传
              </Button>
              <Button onClick={handleMappingNext}>
                下一步：预览数据
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {importStep === 'preview' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-800">
                    共读取 {previewData.length} 条数据
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    有效数据 {previewData.filter((p) => p.isValid).length} 条，
                    存在问题 {previewData.filter((p) => !p.isValid).length} 条
                  </p>
                </div>
              </div>
            </div>

            <Select
              label="导入到店铺"
              value={importShopId}
              onChange={(e) => setImportShopId(e.target.value)}
            >
              <option value="">请选择店铺</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
              ))}
            </Select>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">状态</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>商品名称</TableHead>
                      <TableHead className="text-right">售价</TableHead>
                      <TableHead className="text-right">成本价</TableHead>
                      <TableHead className="text-right">库存</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((item, index) => (
                      <TableRow key={index} className={cn(!item.isValid && 'bg-red-50/50')}>
                        <TableCell>
                          {item.isValid ? (
                            <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                          ) : (
                            <div className="relative group mx-auto w-5">
                              <AlertCircle className="w-5 h-5 text-red-500" />
                              {item.errors.length > 0 && (
                                <div className="absolute left-8 top-0 z-10 hidden group-hover:block bg-red-500 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                                  {item.errors.join('、')}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">
                          {String(item.mappedRow.sku || '-')}
                        </TableCell>
                        <TableCell>
                          {String(item.mappedRow.name || '-')}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(item.mappedRow.salePrice || 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(item.mappedRow.costPrice || 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(item.mappedRow.stock || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setImportStep('mapping')}>
                <X className="w-4 h-4 mr-2" />
                返回匹配
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={!importShopId || previewData.filter((p) => p.isValid).length === 0}
              >
                <Check className="w-4 h-4 mr-2" />
                确认导入 {previewData.filter((p) => p.isValid).length} 条
              </Button>
            </div>
          </div>
        )}

        {importStep === 'success' && (
          <div className="space-y-6 py-6 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">导入成功</p>
              <p className="text-slate-500 mt-2">
                已成功导入 <span className="font-bold text-emerald-600">{importedCount}</span> 件商品到商品池
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <Button variant="outline" onClick={closeImportModal}>
                关闭
              </Button>
              <Button onClick={closeImportModal}>
                查看商品列表
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        title="导入批次记录"
        description="查看历史导入记录，可回滚误导入的批次"
        size="lg"
      >
        <div className="space-y-4">
          {importBatches.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <History className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>暂无导入批次记录</p>
              <p className="text-sm mt-1">从商品池导入或同步商品后会产生批次记录</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {importBatches.map((batch) => {
                const shopName = shops.find((s) => s.id === batch.shopId)?.name || '-';
                return (
                  <div
                    key={batch.id}
                    className={cn(
                      'p-4 border rounded-xl transition-all',
                      batch.status === 'rolled_back'
                        ? 'border-slate-200 bg-slate-50 opacity-60'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'p-2 rounded-lg',
                          batch.sourceType === 'file' ? 'bg-purple-100' : 'bg-blue-100'
                        )}>
                          {batch.sourceType === 'file' ? (
                            <FileUp className="w-5 h-5 text-purple-600" />
                          ) : (
                            <Store className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">
                              {batch.sourceName}
                            </span>
                            <Badge variant={batch.status === 'active' ? 'success' : 'warning'}>
                              {batch.status === 'active' ? '有效' : '已回滚'}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            {shopName} · {formatDate(batch.createdAt)}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-slate-600">
                              共 <span className="font-medium text-slate-800">{batch.totalCount}</span> 条
                            </span>
                            <span className="text-emerald-600">
                              成功 {batch.successCount}
                            </span>
                            <span className="text-red-600">
                              失败 {batch.failCount}
                            </span>
                          </div>
                          {batch.failReasons.length > 0 && (
                            <div className="mt-2 text-xs text-slate-500">
                              <span className="text-red-500">失败原因：</span>
                              {batch.failReasons.join('、')}
                            </div>
                          )}
                        </div>
                      </div>
                      {batch.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRollbackTarget(batch)}
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                          回滚
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={!!rollbackTarget}
        onClose={() => setRollbackTarget(null)}
        title="确认回滚"
        description="回滚后该批次导入的所有商品将被删除，且无法恢复"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">
                  确定回滚「{rollbackTarget?.sourceName}」批次？
                </p>
                <p className="text-sm text-amber-600 mt-1">
                  该批次共 {rollbackTarget?.successCount} 件商品将从商品池中移除
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setRollbackTarget(null)}>
              取消
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (rollbackTarget) {
                  rollbackImportBatch(rollbackTarget.id);
                  setRollbackTarget(null);
                }
              }}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              确认回滚
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface ProductRowProps {
  product: Product;
  shopName: string;
  isSelected: boolean;
  onToggle: () => void;
  getStockBadge: (stock: number) => React.ReactNode;
  getMarginBadge: (margin: number) => React.ReactNode;
}

function ProductRow({ product, shopName, isSelected, onToggle, getStockBadge, getMarginBadge }: ProductRowProps) {
  return (
    <TableRow className={cn(isSelected && 'bg-blue-50/50')}>
      <TableCell>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <img
            src={product.image}
            alt={product.name}
            className="w-12 h-12 rounded-lg object-cover bg-slate-100"
          />
          <div>
            <p className="font-medium text-slate-800">{product.name}</p>
            <p className="text-sm text-slate-500">{product.sku}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-slate-600">{shopName}</TableCell>
      <TableCell>
        <Badge variant="default">{product.category}</Badge>
      </TableCell>
      <TableCell className="text-right font-medium text-slate-800">
        {formatCurrency(product.salePrice)}
      </TableCell>
      <TableCell className="text-right text-slate-600">
        {formatCurrency(product.costPrice)}
      </TableCell>
      <TableCell className="text-right">{getMarginBadge(product.margin)}</TableCell>
      <TableCell className="text-right">
        <span className="font-medium text-slate-800">{product.stock.toLocaleString()}</span>
      </TableCell>
      <TableCell>{getStockBadge(product.stock)}</TableCell>
    </TableRow>
  );
}
