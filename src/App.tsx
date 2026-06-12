import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import ProductPool from "@/pages/ProductPool";
import ActivityConfig from "@/pages/ActivityConfig";
import PriceCheck from "@/pages/PriceCheck";
import Dashboard from "@/pages/Dashboard";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<AppLayout title="效果看板" subtitle="活动数据追踪与分析" />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
        <Route element={<AppLayout title="商品池" subtitle="商品管理与选品" />}>
          <Route path="/products" element={<ProductPool />} />
        </Route>
        <Route element={<AppLayout title="活动配置" subtitle="促销规则设置与预览" />}>
          <Route path="/activities" element={<ActivityConfig />} />
          <Route path="/activities/:id" element={<ActivityConfig />} />
        </Route>
        <Route element={<AppLayout title="价格校验" subtitle="风险检查与审核" />}>
          <Route path="/price-check" element={<PriceCheck />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
