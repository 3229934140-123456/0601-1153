import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from './Card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'red';
}

export function MetricCard({
  title,
  value,
  prefix,
  suffix,
  change,
  changeLabel = '较上期',
  icon,
  color = 'blue',
}: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  const changeColor = change && change > 0 ? 'text-emerald-600' : change && change < 0 ? 'text-red-600' : 'text-slate-500';
  const ChangeIcon = change && change > 0 ? TrendingUp : change && change < 0 ? TrendingDown : Minus;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-1">
            {prefix && <span className="text-lg text-slate-500">{prefix}</span>}
            <span className="text-2xl font-bold text-slate-800">{value}</span>
            {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
          </div>
          {change !== undefined && (
            <div className={cn('mt-2 flex items-center gap-1 text-sm', changeColor)}>
              <ChangeIcon className="w-4 h-4" />
              <span className="font-medium">
                {change > 0 ? '+' : ''}
                {change.toFixed(1)}%
              </span>
              <span className="text-slate-500">{changeLabel}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('p-3 rounded-xl', colorClasses[color])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
