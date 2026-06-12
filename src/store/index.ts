import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, Shop, Activity, PriceCheckRecord, ActivityDailyData, ProductFilter, PromotionRule, ImportedProductRow, ImportBatch, AuditType } from '../types';
import { mockShops, mockProducts, mockActivities, mockPriceCheckRecords, mockActivityData, mockSelectedProductIds } from '../data/mockData';
import { generatePriceCheckRecord } from '../utils/price';

interface AppState {
  shops: Shop[];
  products: Product[];
  importBatches: ImportBatch[];
  activities: Activity[];
  priceCheckRecords: PriceCheckRecord[];
  activityData: ActivityDailyData[];
  selectedProductIds: string[];
  currentFilter: ProductFilter;
  currentActivityId: string | null;

  setFilter: (filter: Partial<ProductFilter>) => void;
  toggleProductSelection: (productId: string) => void;
  selectAllProducts: (productIds: string[]) => void;
  clearSelectedProducts: () => void;
  setCurrentActivity: (activityId: string | null) => void;

  addProducts: (products: Omit<Product, 'id' | 'createdAt'>[], batchId?: string) => Product[];
  importProductsFromShop: (shopId: string, count?: number) => { products: Product[]; batch: ImportBatch };
  createImportBatch: (data: Omit<ImportBatch, 'id' | 'createdAt' | 'status'>) => ImportBatch;
  updateImportBatch: (batchId: string, data: Partial<ImportBatch>) => void;
  rollbackImportBatch: (batchId: string) => void;

  createActivity: (data: Omit<Activity, 'id' | 'createdAt' | 'totalDiscount'>) => Activity;
  updateActivity: (activityId: string, data: Partial<Activity>) => void;
  updateActivityRules: (activityId: string, rules: PromotionRule[]) => void;
  submitActivityForReview: (activityId: string) => void;
  approveActivity: (activityId: string) => void;
  rejectActivity: (activityId: string, remark: string) => void;
  canApproveActivity: (activityId: string) => boolean;

  runPriceCheck: (activityId: string) => PriceCheckRecord[];
  updatePriceCheckAudit: (checkId: string, status: PriceCheckRecord['auditStatus'], remark?: string, auditType?: AuditType) => void;
  batchUpdatePriceCheckAudit: (activityId: string, status: PriceCheckRecord['auditStatus'], remark?: string) => void;

  addOrUpdateActivityDailyData: (activityId: string, data: Omit<ActivityDailyData, 'id' | 'activityId'>) => void;
  generateActivityDailyData: (activityId: string) => void;

  getFilteredProducts: () => Product[];
  getActivityById: (activityId: string) => Activity | undefined;
  getActivityProducts: (activityId: string) => Product[];
  getActivityPriceChecks: (activityId: string) => PriceCheckRecord[];
  getActivityDailyData: (activityId: string) => ActivityDailyData[];
  getActivitySummary: (activityId: string) => {
    totalGmv: number;
    totalOrders: number;
    totalVisitors: number;
    avgConversionRate: number;
    totalProfit: number;
    totalUnitsSold: number;
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      shops: mockShops,
      products: mockProducts,
      importBatches: [],
      activities: mockActivities,
      priceCheckRecords: mockPriceCheckRecords,
      activityData: mockActivityData,
      selectedProductIds: mockSelectedProductIds,
      currentFilter: {},
      currentActivityId: null,

      setFilter: (filter) => set((state) => ({ currentFilter: { ...state.currentFilter, ...filter } })),

      toggleProductSelection: (productId) => set((state) => ({
        selectedProductIds: state.selectedProductIds.includes(productId)
          ? state.selectedProductIds.filter((id) => id !== productId)
          : [...state.selectedProductIds, productId],
      })),

      selectAllProducts: (productIds) => set({ selectedProductIds: productIds }),

      clearSelectedProducts: () => set({ selectedProductIds: [] }),

      setCurrentActivity: (activityId) => set({ currentActivityId: activityId }),

      addProducts: (newProducts, batchId) => {
        const products: Product[] = newProducts.map((p) => ({
          ...p,
          id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          createdAt: new Date().toISOString(),
          importBatchId: batchId,
        }));
        set((state) => ({ products: [...state.products, ...products] }));
        return products;
      },

      importProductsFromShop: (shopId, count = 10) => {
        const shop = get().shops.find((s) => s.id === shopId);
        if (!shop) return { products: [], batch: {} as ImportBatch };

        const batchId = `batch-${Date.now()}`;
        const sampleCategories = ['服饰', '数码', '美妆', '家居', '食品', '母婴', '运动'];
        const sampleNames = [
          '新款休闲装', '无线耳机', '保湿面霜', '简约台灯', '坚果礼盒',
          '儿童玩具', '跑步运动鞋', '智能手环', '口红套装', '纯棉T恤',
          '蓝牙音箱', '保温杯', '面膜套装', '双肩背包', '咖啡机',
        ];

        const imported: Product[] = [];
        for (let i = 0; i < count; i++) {
          const costPrice = Math.round((20 + Math.random() * 200) * 100) / 100;
          const salePrice = Math.round(costPrice * (1.3 + Math.random() * 0.8) * 100) / 100;
          imported.push({
            id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            sku: `SKU${String(Date.now()).slice(-6)}${String(i).padStart(3, '0')}`,
            name: `${sampleNames[i % sampleNames.length]}${shop.name.slice(0, 2)}${i + 1}号`,
            image: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ecommerce%20product%20${encodeURIComponent(sampleNames[i % sampleNames.length])}&image_size=square`,
            category: sampleCategories[i % sampleCategories.length],
            costPrice,
            salePrice,
            stock: Math.floor(50 + Math.random() * 500),
            margin: Math.round(((salePrice - costPrice) / salePrice) * 100),
            shopId,
            createdAt: new Date().toISOString(),
            importBatchId: batchId,
          });
        }

        const batch: ImportBatch = {
          id: batchId,
          sourceType: 'shop',
          sourceName: shop.name,
          shopId,
          totalCount: count,
          successCount: count,
          failCount: 0,
          failReasons: [],
          productIds: imported.map((p) => p.id),
          createdAt: new Date().toISOString(),
          status: 'active',
        };

        set((state) => ({
          products: [...state.products, ...imported],
          importBatches: [batch, ...state.importBatches],
        }));
        return { products: imported, batch };
      },

      createImportBatch: (data) => {
        const batch: ImportBatch = {
          ...data,
          id: `batch-${Date.now()}`,
          createdAt: new Date().toISOString(),
          status: 'active',
        };
        set((state) => ({ importBatches: [batch, ...state.importBatches] }));
        return batch;
      },

      updateImportBatch: (batchId, data) => set((state) => ({
        importBatches: state.importBatches.map((b) =>
          b.id === batchId ? { ...b, ...data } : b
        ),
      })),

      rollbackImportBatch: (batchId) => {
        set((state) => {
          const batch = state.importBatches.find((b) => b.id === batchId);
          if (!batch || batch.status === 'rolled_back') return state;
          return {
            products: state.products.filter((p) => p.importBatchId !== batchId),
            importBatches: state.importBatches.map((b) =>
              b.id === batchId ? { ...b, status: 'rolled_back' } : b
            ),
            selectedProductIds: state.selectedProductIds.filter((id) => !batch.productIds.includes(id)),
          };
        });
      },

      createActivity: (data) => {
        const newActivity: Activity = {
          ...data,
          id: `act-${Date.now()}`,
          createdAt: new Date().toISOString(),
          totalDiscount: 0,
        };
        set((state) => ({ activities: [...state.activities, newActivity] }));
        return newActivity;
      },

      updateActivity: (activityId, data) => set((state) => ({
        activities: state.activities.map((a) => (a.id === activityId ? { ...a, ...data } : a)),
      })),

      updateActivityRules: (activityId, rules) => set((state) => ({
        activities: state.activities.map((a) => (a.id === activityId ? { ...a, promotionRules: rules } : a)),
      })),

      submitActivityForReview: (activityId) => set((state) => ({
        activities: state.activities.map((a) => (a.id === activityId ? { ...a, status: 'pending' } : a)),
      })),

      approveActivity: (activityId) => {
        const state = get();
        const activity = state.getActivityById(activityId);
        set({
          activities: state.activities.map((a) => (a.id === activityId ? { ...a, status: 'approved' } : a)),
          priceCheckRecords: state.priceCheckRecords.map((c) => {
            if (c.activityId !== activityId || c.auditStatus !== 'pending') return c;
            const isHighRisk = c.riskLevel === 'high';
            const auditType: AuditType = isHighRisk ? 'remark_approved' : 'normal_approved';
            return {
              ...c,
              auditStatus: 'approved',
              auditType,
              auditedAt: new Date().toISOString(),
              auditor: '系统自动',
            };
          }),
        });
        if (activity) {
          get().generateActivityDailyData(activityId);
        }
      },

      rejectActivity: (activityId, remark) => set((state) => ({
        activities: state.activities.map((a) => (a.id === activityId ? { ...a, status: 'rejected' } : a)),
        priceCheckRecords: state.priceCheckRecords.map((c) =>
          c.activityId === activityId && c.auditStatus === 'pending'
            ? { ...c, auditStatus: 'rejected', auditType: 'rejected', auditRemark: remark, auditedAt: new Date().toISOString(), auditor: '运营人员' }
            : c
        ),
      })),

      canApproveActivity: (activityId) => {
        const checks = get().getActivityPriceChecks(activityId);
        if (checks.length === 0) return false;
        const hasPending = checks.some((c) => c.auditStatus === 'pending');
        return !hasPending;
      },

      runPriceCheck: (activityId) => {
        const activity = get().getActivityById(activityId);
        if (!activity) return [];

        const products = get().getActivityProducts(activityId);
        const newRecords = products.map((product) =>
          generatePriceCheckRecord(activityId, product, activity.promotionRules)
        );

        set((state) => ({
          priceCheckRecords: [
            ...state.priceCheckRecords.filter((c) => c.activityId !== activityId),
            ...newRecords,
          ],
        }));

        return newRecords;
      },

      updatePriceCheckAudit: (checkId, status, remark, auditType) => set((state) => ({
        priceCheckRecords: state.priceCheckRecords.map((c) => {
          if (c.id !== checkId) return c;
          let computedType: AuditType = auditType || 'pending';
          if (!auditType) {
            if (status === 'rejected') {
              computedType = 'rejected';
            } else if (status === 'approved') {
              computedType = remark && remark.trim() ? 'remark_approved' : 'normal_approved';
            }
          }
          return {
            ...c,
            auditStatus: status,
            auditType: computedType,
            auditRemark: remark,
            auditedAt: new Date().toISOString(),
            auditor: '运营人员',
          };
        }),
      })),

      batchUpdatePriceCheckAudit: (activityId, status, remark) => set((state) => ({
        priceCheckRecords: state.priceCheckRecords.map((c) => {
          if (c.activityId !== activityId) return c;
          let computedType: AuditType = 'pending';
          if (status === 'rejected') {
            computedType = 'rejected';
          } else if (status === 'approved') {
            computedType = remark && remark.trim() ? 'remark_approved' : 'normal_approved';
          }
          return {
            ...c,
            auditStatus: status,
            auditType: computedType,
            auditRemark: remark,
            auditedAt: new Date().toISOString(),
            auditor: '运营人员',
          };
        }),
      })),

      getFilteredProducts: () => {
        const { products, currentFilter } = get();
        return products.filter((p) => {
          if (currentFilter.shopId && p.shopId !== currentFilter.shopId) return false;
          if (currentFilter.category && p.category !== currentFilter.category) return false;
          if (currentFilter.minStock !== undefined && p.stock < currentFilter.minStock) return false;
          if (currentFilter.maxStock !== undefined && p.stock > currentFilter.maxStock) return false;
          if (currentFilter.minMargin !== undefined && p.margin < currentFilter.minMargin) return false;
          if (currentFilter.maxMargin !== undefined && p.margin > currentFilter.maxMargin) return false;
          if (currentFilter.minPrice !== undefined && p.salePrice < currentFilter.minPrice) return false;
          if (currentFilter.maxPrice !== undefined && p.salePrice > currentFilter.maxPrice) return false;
          if (currentFilter.search && !p.name.includes(currentFilter.search) && !p.sku.includes(currentFilter.search)) return false;
          return true;
        });
      },

      getActivityById: (activityId) => get().activities.find((a) => a.id === activityId),

      getActivityProducts: (activityId) => {
        const activity = get().getActivityById(activityId);
        if (!activity) return [];
        return get().products.filter((p) => activity.productIds.includes(p.id));
      },

      getActivityPriceChecks: (activityId) => get().priceCheckRecords.filter((c) => c.activityId === activityId),

      getActivityDailyData: (activityId) => get().activityData.filter((d) => d.activityId === activityId),

      getActivitySummary: (activityId) => {
        const dailyData = get().getActivityDailyData(activityId);
        const totalVisitors = dailyData.reduce((sum, d) => sum + d.visitors, 0);
        const totalOrders = dailyData.reduce((sum, d) => sum + d.orders, 0);
        const totalGmv = dailyData.reduce((sum, d) => sum + d.gmv, 0);
        const totalProfit = dailyData.reduce((sum, d) => sum + d.profit, 0);
        const totalUnitsSold = dailyData.reduce((sum, d) => sum + d.unitsSold, 0);
        const avgConversionRate = dailyData.length > 0
          ? dailyData.reduce((sum, d) => sum + d.conversionRate, 0) / dailyData.length
          : 0;

        return { totalGmv, totalOrders, totalVisitors, avgConversionRate, totalProfit, totalUnitsSold };
      },

      addOrUpdateActivityDailyData: (activityId, data) => {
        set((state) => {
          const existingIndex = state.activityData.findIndex(
            (d) => d.activityId === activityId && d.date === data.date
          );
          let newActivityData;
          if (existingIndex >= 0) {
            newActivityData = [...state.activityData];
            newActivityData[existingIndex] = {
              ...newActivityData[existingIndex],
              ...data,
            };
          } else {
            newActivityData = [
              ...state.activityData,
              {
                ...data,
                id: `daily-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                activityId,
              },
            ];
          }
          return { activityData: newActivityData };
        });
      },

      generateActivityDailyData: (activityId) => {
        const activity = get().getActivityById(activityId);
        if (!activity) return;

        const start = new Date(activity.startTime);
        const end = new Date(activity.endTime);
        const products = get().getActivityProducts(activityId);
        const avgPrice = products.length > 0
          ? products.reduce((sum, p) => sum + p.salePrice, 0) / products.length
          : 100;
        const avgCost = products.length > 0
          ? products.reduce((sum, p) => sum + p.costPrice, 0) / products.length
          : 60;

        const dailyDataList: ActivityDailyData[] = [];
        const current = new Date(start);
        while (current <= end) {
          const dayOfWeek = current.getDay();
          const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1;
          const progress = (current.getTime() - start.getTime()) / (end.getTime() - start.getTime());
          const peakMultiplier = 1 + Math.sin(progress * Math.PI) * 0.4;

          const baseVisitors = 2000 + products.length * 200;
          const visitors = Math.round(baseVisitors * weekendMultiplier * peakMultiplier * (0.8 + Math.random() * 0.4));
          const conversionRate = 3 + Math.random() * 3;
          const orders = Math.round(visitors * conversionRate / 100);
          const avgOrderValue = avgPrice * (1.1 + Math.random() * 0.3);
          const gmv = Math.round(orders * avgOrderValue);
          const profit = Math.round(orders * (avgOrderValue - avgCost));
          const unitsSold = Math.round(orders * (1 + Math.random() * 0.5));

          dailyDataList.push({
            id: `daily-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            activityId,
            date: current.toISOString().slice(0, 10),
            visitors,
            orders,
            conversionRate,
            gmv,
            profit,
            unitsSold,
          });

          current.setDate(current.getDate() + 1);
        }

        set((state) => ({
          activityData: [
            ...state.activityData.filter((d) => d.activityId !== activityId),
            ...dailyDataList,
          ],
        }));
      },
    }),
    {
      name: 'ecommerce-promotion-store',
      partialize: (state) => ({
        shops: state.shops,
        products: state.products,
        importBatches: state.importBatches,
        activities: state.activities,
        priceCheckRecords: state.priceCheckRecords,
        activityData: state.activityData,
        selectedProductIds: state.selectedProductIds,
      }),
    }
  )
);
