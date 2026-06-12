import { NavLink } from 'react-router-dom';
import { Package, Settings, ShieldCheck, BarChart3, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/products', label: '商品池', icon: Package },
  { path: '/activities', label: '活动配置', icon: Settings },
  { path: '/price-check', label: '价格校验', icon: ShieldCheck },
  { path: '/dashboard', label: '效果看板', icon: BarChart3 },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-50">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">促销管家</h1>
            <p className="text-xs text-slate-400">电商运营平台</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
              运
            </div>
            <div>
              <p className="text-sm font-medium">运营小王</p>
              <p className="text-xs text-slate-400">优品旗舰店</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
