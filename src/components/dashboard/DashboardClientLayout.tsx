
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store/store';
import { clearUser, setUser, selectCurrentUser } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/button';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, useSidebar, SidebarFooter, SidebarTrigger } from "@/components/ui/sidebar";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Settings, PackageIcon, UsersIcon, UserCogIcon, ArchiveIcon, BuildingIcon, ReceiptText, MenuIcon as MobileMenuIcon, ShoppingCartIcon, PercentIcon, ArchiveX, TrendingUp, LogOut, WalletCards, FileText, DoorClosed, BarChart3, ShieldAlert, Home, ShoppingBag } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { AuthUser } from '@/store/slices/authSlice';
import { logoutAction } from '@/app/actions/authActions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type DashboardView = 'welcome' | 'products' | 'purchases' | 'reports' | 'creditManagement' | 'cashRegister' | 'discounts' | 'financials' | 'parties' | 'stock' | 'lostDamage' | 'users' | 'company' | 'settings';

interface ViewConfigItem {
  name: string;
  icon: React.ElementType;
  path: string;
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

export function DashboardClientLayout({
  initialUser,
  children,
}: {
  initialUser: AuthUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch: AppDispatch = useDispatch();

  const [activeView, setActiveView] = useState<DashboardView>('welcome');
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  
  // This effect runs once on the client to set the user from server props
  useEffect(() => {
    if (initialUser) {
      dispatch(setUser(initialUser));
    }
  }, [dispatch, initialUser]);

  const currentUser = useSelector(selectCurrentUser);
  const { can } = usePermissions();

  useEffect(() => {
    const currentViewKey = (Object.keys(viewConfig) as DashboardView[]).find(key => {
        const configPath = viewConfig[key].path;
        if (configPath === '/dashboard') return pathname === '/dashboard';
        return pathname.startsWith(configPath);
    });

    if (currentViewKey) {
        setActiveView(currentViewKey);
    }
  }, [pathname]);
  
  const handleLogout = async () => {
    await logoutAction();
    dispatch(clearUser());
    router.push('/login');
  };

  const handleDirectLogout = () => {
    handleLogout();
  };

  const visibleViews = (Object.keys(viewConfig) as DashboardView[]).filter(viewKey => 
    can(viewConfig[viewKey].permission?.action as any, viewConfig[viewKey].permission?.subject as any)
  );
  
  if (!currentUser) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <p className="text-muted-foreground">Loading...</p>
        </div>
    );
  }

  const SidebarInternal = () => {
    const { isMobile, toggleSidebar } = useSidebar();
    return (
      <Sidebar side="left" collapsible="icon" className="border-r border-border/30">
        {isMobile && (<SheetHeader className="sr-only"><SheetTitle>Navigation Menu</SheetTitle></SheetHeader>)}
        <SidebarHeader className="border-b border-border/30 p-2 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg text-foreground group-data-[collapsible=icon]:hidden">Go to POS</span>
          </Link>
           <SidebarTrigger className="hidden md:flex text-foreground"/>
          {isMobile && (<Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden text-foreground"><MobileMenuIcon /></Button>)}
        </SidebarHeader>
        <SidebarContent><SidebarMenu>
            {visibleViews.map((viewKey) => {
              const config = viewConfig[viewKey];
              const IconComponent = config.icon;
              return (
                  <SidebarMenuItem key={viewKey}><SidebarMenuButton asChild isActive={activeView === viewKey} tooltip={{ children: config.name, side: "right" }}>
                      <Link href={config.path}>
                        <IconComponent className="h-5 w-5" />
                        <span className="group-data-[collapsible=icon]:hidden">{config.name}</span>
                      </Link>
                  </SidebarMenuButton></SidebarMenuItem>
                );
            })}
        </SidebarMenu></SidebarContent>
        <SidebarFooter className="border-t border-border/30"><SidebarMenu>
            <SidebarMenuItem><div className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="bg-primary/20 text-primary font-semibold">{currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'G'}</AvatarFallback></Avatar>
                <div className="flex-grow overflow-hidden group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-semibold text-foreground truncate">{currentUser?.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentUser?.role?.name}</p>
                    <p className="text-xs text-primary/80 truncate">{currentUser?.company?.name || 'Super Admin'}</p>
                </div>
            </div></SidebarMenuItem>
            <SidebarMenuItem>
                <AlertDialogTrigger asChild>
                    <SidebarMenuButton onClick={(e) => { e.preventDefault(); setIsLogoutDialogOpen(true); }} tooltip={{ children: "Logout", side: "right" }} className="text-red-400 hover:bg-destructive/20 hover:text-red-300">
                        <LogOut className="h-5 w-5" />
                        <span className="group-data-[collapsible=icon]:hidden">Logout</span>
                    </SidebarMenuButton>
                </AlertDialogTrigger>
            </SidebarMenuItem>
        </SidebarMenu></SidebarFooter>
      </Sidebar>
    );
  };
  
  const MobileToggleButton = () => {
      const { isMobile, toggleSidebar } = useSidebar();
      if (!isMobile) return null;
      return (<Button variant="ghost" size="icon" onClick={toggleSidebar} className="absolute top-4 left-4 z-20 md:hidden text-foreground"><MobileMenuIcon /></Button>);
  };

  return (
    <TooltipProvider>
    <SidebarProvider defaultOpen={true}>
        <MobileToggleButton />
        <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <SidebarInternal />
          <SidebarInset>{children}</SidebarInset>
           <AlertDialogContent className="grid-rows-[auto_1fr_auto] p-0">
                <div className="relative p-6 flex flex-col flex-grow h-[400px]">
                     <AlertDialogHeader className="text-center mb-4">
                        <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                        <AlertDialogDescription>
                            How would you like to proceed? Your shift will remain open.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => { router.push('/dashboard/cash-register'); setIsLogoutDialogOpen(false); }}
                                className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
                                aria-label="Go to End Shift Page"
                            >
                                <DoorClosed className="h-5 w-5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Go to End Shift Page</p>
                        </TooltipContent>
                    </Tooltip>

                    <div className="flex-1 flex flex-col items-center justify-center">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => { handleDirectLogout(); setIsLogoutDialogOpen(false); }}
                                    className="h-24 w-24 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
                                    aria-label="Logout Only (Keep Shift Open)"
                                >
                                    <LogOut className="h-10 w-10 text-foreground" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Logout Only (Keep Shift Open)</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    <div className="mt-6">
                        <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
                    </div>
                </div>
           </AlertDialogContent>
        </AlertDialog>
    </SidebarProvider>
    </TooltipProvider>
  );
}
