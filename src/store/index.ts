import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, Shop, Activity, PriceCheckRecord, ActivityDailyData, ProductFilter, PromotionRule } from '../types';
import { mockShops, mockProducts, mockActivities, mockPriceCheckRecords, mockActivityData, mockSelectedProductIds } from '../data/mockData';
import { generatePriceCheckRecord } from '../utils/price';

interface AppState {
  shops: Shop[];
  products: Product[];
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

  createActivity: (data: Omit<Activity, 'id' | 'createdAt' | 'totalDiscount'>) => Activity;
  updateActivity: (activityId: string, data: Partial<Activity>) => void;
  updateActivityRules: (activityId: string, rules: PromotionRule[]) => void;
  submitActivityForReview: (activityId: string) => void;
  approveActivity: (activityId: string) => void;
  rejectActivity: (activityId: string, remark: string) => void;

  runPriceCheck: (activityId: string) => PriceCheckRecord[];
  updatePriceCheckAudit: (checkId: string, status: PriceCheckRecord['auditStatus'], remark?: string) => void;
  batchUpdatePriceCheckAudit: (activityId: string, status: PriceCheckRecord['auditStatus'], remark?: string) => void;

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

      approveActivity: (activityId) => set((state) => ({
        activities: state.activities.map((a) => (a.id === activityId ? { ...a, status: 'approved' } : a)),
        priceCheckRecords: state.priceCheckRecords.map((c) =>
          c.activityId === activityId ? { ...c, auditStatus: 'approved', auditedAt: new Date().toISOString() } : c
        ),
      })),

      rejectActivity: (activityId, remark) => set((state) => ({
        activities: state.activities.map((a) => (a.id === activityId ? { ...a, status: 'rejected' } : a)),
        priceCheckRecords: state.priceCheckRecords.map((c) =>
          c.activityId === activityId
            ? { ...c, auditStatus: 'rejected', auditRemark: remark, auditedAt: new Date().toISOString() }
            : c
        ),
      })),

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

      updatePriceCheckAudit: (checkId, status, remark) => set((state) => ({
        priceCheckRecords: state.priceCheckRecords.map((c) =>
          c.id === checkId
            ? { ...c, auditStatus: status, auditRemark: remark, auditedAt: new Date().toISOString() }
            : c
        ),
      })),

      batchUpdatePriceCheckAudit: (activityId, status, remark) => set((state) => ({
        priceCheckRecords: state.priceCheckRecords.map((c) =>
          c.activityId === activityId
            ? { ...c, auditStatus: status, auditRemark: remark, auditedAt: new Date().toISOString() }
            : c
        ),
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
    }),
    {
      name: 'ecommerce-promotion-store',
      partialize: (state) => ({
        activities: state.activities,
        priceCheckRecords: state.priceCheckRecords,
        activityData: state.activityData,
        selectedProductIds: state.selectedProductIds,
      }),
    }
  )
);
