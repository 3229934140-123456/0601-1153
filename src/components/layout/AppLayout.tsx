import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  title: string;
  subtitle?: string;
}

export function AppLayout({ title, subtitle }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="ml-64">
        <Header title={title} subtitle={subtitle} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
