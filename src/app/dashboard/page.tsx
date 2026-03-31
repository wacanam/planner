'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <svg
            aria-hidden="true"
            className="animate-spin h-8 w-8 text-blue-600"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const user = session?.user as { name?: string | null; email?: string | null; role?: string };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.name ?? user?.email}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-3xl mb-3">🗺️</div>
          <h3 className="font-semibold text-gray-900">Territories</h3>
          <p className="text-sm text-gray-500 mt-1">Manage your territory assignments</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-3xl mb-3">📋</div>
          <h3 className="font-semibold text-gray-900">Routes</h3>
          <p className="text-sm text-gray-500 mt-1">Plan and track ministry routes</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-3xl mb-3">👥</div>
          <h3 className="font-semibold text-gray-900">Team</h3>
          <p className="text-sm text-gray-500 mt-1">Coordinate with your congregation</p>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h2 className="font-semibold text-blue-900 mb-2">Account Details</h2>
        <dl className="space-y-1 text-sm text-blue-800">
          <div className="flex gap-2">
            <dt className="font-medium">Name:</dt>
            <dd>{user?.name}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium">Email:</dt>
            <dd>{user?.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium">Role:</dt>
            <dd>{user?.role}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
