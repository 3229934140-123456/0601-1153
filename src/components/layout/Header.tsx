import { Bell, Search, Calendar, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '@/utils/date';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: '活动「618年中大促」已通过审核', time: '10分钟前', type: 'success' },
    { id: 2, title: '发现2个商品存在低于成本风险', time: '1小时前', type: 'warning' },
    { id: 3, title: '活动「新品上市85折」待审核', time: '2小时前', type: 'info' },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
      <div>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(new Date(), 'yyyy年MM月dd日 EEEE')}</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">通知中心</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notif.type === 'success'
                            ? 'bg-emerald-500'
                            : notif.type === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <div>
                        <p className="text-sm text-slate-700">{notif.title}</p>
                        <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-slate-100">
                <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
                  查看全部通知
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
