import { AdminHeader } from '@/components/admin-header';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <AdminHeader />
      <div className="flex-1">{children}</div>
    </div>
  );
}
