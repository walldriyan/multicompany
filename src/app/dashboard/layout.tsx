
import React from 'react';
import { redirect } from 'next/navigation';
import { verifyAuth } from '@/lib/auth';
import { DashboardClientLayout } from '@/components/dashboard/DashboardClientLayout';
import { store } from '@/store/store';
import { setUser } from '@/store/slices/authSlice';

// This is now a SERVER COMPONENT
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Verify authentication on the server before rendering anything
  const { user } = await verifyAuth();

  // 2. If no user, redirect to login from the server. This is the key fix for the flicker.
  if (!user) {
    return redirect('/login');
  }

  // 3. Perform the permission check on the server, accessing the correct nested structure.
  const rolePermissions = user.role?.permissions ?? [];

  // Correctly map the nested permission objects
  const canAccessDashboard = 
      rolePermissions.some(rp => rp.permission?.action === 'manage' && rp.permission?.subject === 'all') ||
      rolePermissions.some(rp => rp.permission?.action === 'access' && rp.permission?.subject === 'Dashboard');
  
  // 4. If permission is denied, show an error page from the server
  if (!canAccessDashboard) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-destructive">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">
            You do not have the required permissions to view the dashboard.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Please contact an administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // 5. If everything is OK, render a CLIENT component and pass the user data down
  // This separates server logic from client logic cleanly.
  return (
    <DashboardClientLayout initialUser={user}>
      {children}
    </DashboardClientLayout>
  );
}
