
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store/store';
import { clearUser, selectCurrentUser, selectAuthStatus } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/button';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger as AlertDialogTriggerChild, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Settings, PackageIcon, UsersIcon, UserCogIcon, ArchiveIcon, BuildingIcon, ReceiptText, MenuIcon as MobileMenuIcon, ShoppingCartIcon, PercentIcon, ArchiveX, TrendingUp, LogOut, WalletCards, FileText, DoorClosed, BarChart3, ShieldAlert, Home, ShoppingBag } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from '@/hooks/usePermissions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


type DashboardView = 'welcome' | 'products' | 'purchases' | 'reports' | 'creditManagement' | 'cashRegister' | 'discounts' | 'financials' | 'parties' | 'stock' | 'lostDamage' | 'users' | 'company' | 'settings';

interface ViewConfigItem {
  name: string;
  icon: React.ElementType;
  path: string;
  disabled?: boolean;
  isPlaceholder?: boolean;
  permission: { action: string; subject: string };
}

const viewConfig: Record<DashboardView, ViewConfigItem> = {
  welcome: { name: 'Welcome', icon: Home, path: '/dashboard', permission: { action: 'access', subject: 'Dashboard' } },
  products: { name: 'Product Management', icon: PackageIcon, path: '/dashboard/products', permission: { action: 'read', subject: 'Product' } },
  stock: { name: 'Stock Levels', icon: ArchiveIcon, path: '/dashboard/stock', permission: { action: 'read', subject: 'Product' } },
  lostDamage: { name: 'Stock Adjustments', icon: ArchiveX, path: '/dashboard/lost-damage', permission: { action: 'update', subject: 'Product' } },
  purchases: { name: 'Purchases (GRN)', icon: ShoppingCartIcon, path: '/dashboard/purchases', permission: { action: 'read', subject: 'PurchaseBill' } },
  reports: { name: 'Reports', icon: BarChart3, path: '/dashboard/reports', permission: { action: 'access', subject: 'Dashboard' } },
  creditManagement: { name: 'Credit Management', icon: ReceiptText, path: '/dashboard/credit-management', permission: { action: 'read', subject: 'Sale' } },
  cashRegister: { name: 'Cash Register', icon: WalletCards, path: '/dashboard/cash-register', permission: { action: 'access', subject: 'CashRegister' } },
  parties: { name: 'Contacts (Cust/Supp)', icon: UsersIcon, path: '/dashboard/parties', permission: { action: 'read', subject: 'Party' } },
  users: { name: 'Users & Roles', icon: UserCogIcon, path: '/dashboard/users', permission: { action: 'read', subject: 'User' } },
  company: { name: 'Company Details', icon: BuildingIcon, path: '/dashboard/company', permission: { action: 'manage', subject: 'Settings' } },
  discounts: { name: 'Discount Management', icon: PercentIcon, path: '/dashboard/discounts', permission: { action: 'manage', subject: 'Settings' } },
  financials: { name: 'Income & Expense', icon: TrendingUp, path: '/dashboard/financials', permission: { action: 'manage', subject: 'Settings' } },
  settings: { name: 'Settings', icon: Settings, path: '/dashboard/settings', permission: { action: 'manage', subject: 'Settings' } },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch: AppDispatch = useDispatch();
  const { toast } = useToast();
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true) }, []);
  
  // Always call hooks at the top level.
  const currentUserFromStore = useSelector(selectCurrentUser);
  const authStatus = useSelector(selectAuthStatus);
  const { can } = usePermissions();

  // Then use the `isClient` state to decide which value to use.
  const currentUser = isClient ? currentUserFromStore : { username: "admin", role: { name: "Admin", permissions: [{ action: 'manage', subject: 'all'}] } };
  
  const [activeView, setActiveView] = useState<DashboardView>('welcome');
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  useEffect(() => {
    // Wait until auth status is no longer loading.
    if (!isClient || authStatus === 'loading') {
      return;
    }

    // If auth has resolved and there is NO user, redirect to login page.
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // Determine the current view based on the URL
    const currentViewKey = (Object.keys(viewConfig) as DashboardView[]).find(key => {
        const configPath = viewConfig[key].path;
        if (configPath === '/dashboard') {
            return pathname === '/dashboard';
        }
        return pathname.startsWith(configPath);
    });

    if (currentViewKey) {
        const permission = viewConfig[currentViewKey].permission;
        if (!can(permission.action as any, permission.subject as any)) {
             toast({
                title: "Access Denied",
                description: "You do not have permission to view this page.",
                variant: "destructive",
            });
            router.replace('/dashboard');
        } else {
             setActiveView(currentViewKey);
        }
    }
    
  }, [isClient, authStatus, currentUser, pathname, router, can, toast]);


  const handleDirectLogout = () => {
    dispatch(clearUser());
    router.push('/login');
  };

  const visibleViews = (Object.keys(viewConfig) as DashboardView[]).filter(viewKey => 
    can(viewConfig[viewKey].permission?.action as any, viewConfig[viewKey].permission?.subject as any)
  );

  const SidebarInternal = () => {
    const { isMobile, toggleSidebar } = useSidebar();
    return (
      <Sidebar side="left" collapsible="icon" className="border-r border-border/30">
        {isMobile && (
           <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
           </SheetHeader>
        )}
        <SidebarHeader className="border-b border-border/30 p-2 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg text-foreground group-data-[collapsible=icon]:hidden">Aronium Admin</span>
          </Link>
          {isMobile && (
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden text-foreground">
                  <MobileMenuIcon />
              </Button>
          )}
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {visibleViews.map((viewKey) => {
              const config = viewConfig[viewKey];
              const IconComponent = config.icon;
              return (
                  <SidebarMenuItem key={viewKey}>
                    <SidebarMenuButton
                      asChild
                      isActive={activeView === viewKey}
                      tooltip={{ children: config.name, side: "right" }}
                    >
                      <Link href={config.path}>
                        <IconComponent className="h-5 w-5" />
                        <span className="group-data-[collapsible=icon]:hidden">
                          {config.name}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t border-border/30">
            <SidebarMenu>
                <SidebarMenuItem>
                    <div className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:justify-center">
                        <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                                {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'G'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-grow overflow-hidden group-data-[collapsible=icon]:hidden">
                            <p className="text-sm font-semibold text-foreground truncate">{currentUser?.username}</p>
                            <p className="text-xs text-muted-foreground truncate">{currentUser?.role?.name}</p>
                        </div>
                    </div>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                    <AlertDialogTrigger asChild>
                        <SidebarMenuButton onClick={() => setIsLogoutDialogOpen(true)} tooltip={{ children: "Logout", side: "right" }} className="text-red-400 hover:bg-destructive/20 hover:text-red-300">
                            <LogOut className="h-5 w-5" />
                            <span className="group-data-[collapsible=icon]:hidden">
                                Logout
                            </span>
                        </SidebarMenuButton>
                    </AlertDialogTrigger>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    );
  };
  
  const MobileToggleButton = () => {
      const { isMobile, toggleSidebar } = useSidebar();
      if (!isMobile) return null;
      return (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="absolute top-4 left-4 z-20 md:hidden text-foreground">
              <MobileMenuIcon />
          </Button>
      );
  };
  
  if (!isClient || authStatus === 'loading' || !currentUser) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <p className="text-muted-foreground">Authenticating...</p>
        </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
        <MobileToggleButton />
        <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <SidebarInternal />
          <SidebarInset>
              {children}
          </SidebarInset>
           <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                  <AlertDialogDescription>
                    How would you like to proceed? Your current shift will remain open unless you end it.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
                  <Button onClick={() => { router.push('/dashboard/cash-register'); setIsLogoutDialogOpen(false); }} className="w-full">
                      <DoorClosed className="mr-2 h-4 w-4" /> Go to End Shift Page
                  </Button>
                  <Button variant="secondary" onClick={() => { handleDirectLogout(); setIsLogoutDialogOpen(false); }} className="w-full rounded-full">
                      <LogOut className="mr-2 h-4 w-4" /> Logout Only (Keep Shift Open)
                  </Button>
                  <AlertDialogCancel className="w-full mt-2">Cancel</AlertDialogCancel>
              </AlertDialogFooter>
           </AlertDialogContent>
        </AlertDialog>
    </SidebarProvider>
  );
}
