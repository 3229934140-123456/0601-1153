import { useState, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/utils/price';
import { cn } from '@/lib/utils';
import type { Product, ImportedProductRow } from '@/types';

interface ImportPreviewItem {
  row: ImportedProductRow;
  errors: string[];
  isValid: boolean;
}

export default function ProductPool() {
  const navigate = useNavigate();
  const {
    shops,
    products,
    selectedProductIds,
    currentFilter,
    setFilter,
    toggleProductSelection,
    selectAllProducts,
    clearSelectedProducts,
    getFilteredProducts,
    addProducts,
    importProductsFromShop,
  } = useAppStore();

  const [showFilters, setShowFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [importShopId, setImportShopId] = useState('');
  const [previewData, setPreviewData] = useState<ImportPreviewItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
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

  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: ImportedProductRow[] = XLSX.utils.sheet_to_json(sheet);

        const preview: ImportPreviewItem[] = json.slice(0, 50).map((row) => {
          const errors: string[] = [];
          if (!row.name && !row['商品名称'] && !row['名称']) errors.push('缺少商品名称');
          if (!row.sku && !row['SKU'] && !row['sku']) errors.push('缺少SKU');
          const price = Number(row.salePrice || row['售价'] || row['价格'] || row.sale_price);
          const cost = Number(row.costPrice || row['成本价'] || row['成本'] || row.cost_price);
          if (isNaN(price) || price <= 0) errors.push('售价无效');
          if (isNaN(cost) || cost <= 0) errors.push('成本价无效');
          if (!isNaN(price) && !isNaN(cost) && cost > price) errors.push('成本价高于售价');

          return {
            row,
            errors,
            isValid: errors.length === 0,
          };
        });

        setPreviewData(preview);
        setImportStep('preview');
      } catch (err) {
        alert('文件解析失败，请检查文件格式');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = () => {
    if (!importShopId) {
      alert('请选择导入的店铺');
      return;
    }

    const validItems = previewData.filter((p) => p.isValid);
    if (validItems.length === 0) {
      alert('没有可导入的有效商品数据');
      return;
    }

    const newProducts = validItems.map((item) => {
      const r = item.row;
      const salePrice = Number(r.salePrice || r['售价'] || r['价格'] || r.sale_price) || 0;
      const costPrice = Number(r.costPrice || r['成本价'] || r['成本'] || r.cost_price) || 0;
      return {
        sku: String(r.sku || r['SKU'] || r['sku'] || `SKU${Date.now()}`),
        name: String(r.name || r['商品名称'] || r['名称'] || '未命名商品'),
        category: String(r.category || r['类目'] || r['分类'] || '其他'),
        costPrice,
        salePrice,
        stock: Number(r.stock || r['库存'] || 100),
        margin: salePrice > 0 ? Math.round(((salePrice - costPrice) / salePrice) * 100) : 0,
        shopId: importShopId,
        image: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ecommerce%20product&image_size=square`,
      };
    });

    addProducts(newProducts);
    setImportedCount(newProducts.length);
    setImportStep('success');
  };

  const handleShopSync = async (shopId: string) => {
    setIsSyncing(shopId);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const imported = importProductsFromShop(shopId, 10);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">商品池</h1>
          <p className="text-slate-500 mt-1">管理店铺商品，筛选优质品参与促销活动</p>
        </div>
        <div className="flex items-center gap-3">
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
        title={importStep === 'success' ? '导入成功' : '导入商品'}
        description={
          importStep === 'success'
            ? '商品已成功导入到商品池'
            : '支持 Excel 批量导入或从店铺同步商品数据'
        }
        size={importStep === 'preview' ? 'xl' : 'md'}
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
                          {String(item.row.sku || item.row['SKU'] || item.row['sku'] || '-')}
                        </TableCell>
                        <TableCell>
                          {String(item.row.name || item.row['商品名称'] || item.row['名称'] || '-')}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(item.row.salePrice || item.row['售价'] || 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(item.row.costPrice || item.row['成本价'] || 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(item.row.stock || item.row['库存'] || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setImportStep('upload')}>
                <X className="w-4 h-4 mr-2" />
                返回
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
