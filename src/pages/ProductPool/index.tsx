import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { Product } from '@/types';

export default function ProductPool() {
  const navigate = useNavigate();
  const {
    shops,
    selectedProductIds,
    currentFilter,
    setFilter,
    toggleProductSelection,
    selectAllProducts,
    clearSelectedProducts,
    getFilteredProducts,
  } = useAppStore();

  const [showFilters, setShowFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const filteredProducts = useMemo(() => {
    setFilter({
      search: searchQuery || undefined,
      shopId: selectedShop || undefined,
      category: selectedCategory || undefined,
    });
    return getFilteredProducts();
  }, [searchQuery, selectedShop, selectedCategory, getFilteredProducts, setFilter]);

  const categories = Array.from(new Set(filteredProducts.map((p) => p.category)));

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
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>
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
              <p className="text-xl font-bold text-slate-800">{filteredProducts.length}</p>
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
                {filteredProducts.filter((p) => p.margin >= 40).length}
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
                {filteredProducts.filter((p) => p.stock < 100).length}
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
              <p className="text-sm mt-1">请尝试调整筛选条件</p>
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
        onClose={() => setShowImportModal(false)}
        title="导入商品"
        description="支持 Excel 批量导入或从店铺同步商品数据"
      >
        <div className="space-y-6">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
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
                <Button variant="secondary" size="sm">
                  同步商品
                </Button>
              </div>
            ))}
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
