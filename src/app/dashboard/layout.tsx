
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store/store';
import { clearUser, setUser, selectCurrentUser } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogCancel, AlertDialogAction, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Settings, PackageIcon, UsersIcon, UserCogIcon, ArchiveIcon, BuildingIcon, ReceiptText, MenuIcon as MobileMenuIcon, ShoppingCartIcon, PercentIcon, ArchiveX, TrendingUp, LogOut, WalletCards, FileText, DoorClosed, BarChart3, ShieldAlert, Home, ShoppingBag, Briefcase, UserRound, Contact, Search } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { AuthUser } from '@/store/slices/authSlice';
import { logoutAction } from '@/app/actions/authActions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from '@/components/ui/input';


type DashboardView = 'welcome' | 'products' | 'purchases' | 'reports' | 'creditManagement' | 'cashRegister' | 'discounts' | 'financials' | 'parties' | 'stock' | 'lostDamage' | 'users' | 'company' | 'settings';

interface ViewConfigItem {
  name: string;
  icon: React.ElementType;
  path: string;
  permission: { action: string; subject: string };
  group: 'main' | 'inventory' | 'customers' | 'admin';
}

const viewConfig: Record<DashboardView, ViewConfigItem> = {
  welcome: { name: 'Dashboard', icon: Home, path: '/dashboard', permission: { action: 'access', subject: 'Dashboard' }, group: 'main' },
  products: { name: 'Product', icon: PackageIcon, path: '/dashboard/products', permission: { action: 'read', subject: 'Product' }, group: 'main' },
  parties: { name: 'Customers', icon: Contact, path: '/dashboard/parties', permission: { action: 'read', subject: 'Party' }, group: 'main' },
  financials: { name: 'Income', icon: TrendingUp, path: '/dashboard/financials', permission: { action: 'manage', subject: 'Settings' }, group: 'main' },
  reports: { name: 'Promote', icon: BarChart3, path: '/dashboard/reports', permission: { action: 'access', subject: 'Dashboard' }, group: 'main' },
  
  purchases: { name: 'Purchases (GRN)', icon: ShoppingCartIcon, path: '/dashboard/purchases', permission: { action: 'read', subject: 'PurchaseBill' }, group: 'inventory' },
  stock: { name: 'Stock Levels', icon: ArchiveIcon, path: '/dashboard/stock', permission: { action: 'read', subject: 'Product' }, group: 'inventory' },
  lostDamage: { name: 'Stock Adjustments', icon: ArchiveX, path: '/dashboard/lost-damage', permission: { action: 'update', subject: 'Product' }, group: 'inventory' },
  
  creditManagement: { name: 'Credit Management', icon: ReceiptText, path: '/dashboard/credit-management', permission: { action: 'read', subject: 'Sale' }, group: 'customers' },
  cashRegister: { name: 'Cash Register', icon: WalletCards, path: '/dashboard/cash-register', permission: { action: 'access', subject: 'CashRegister' }, group: 'customers' },

  users: { name: 'Users & Roles', icon: UserCogIcon, path: '/dashboard/users', permission: { action: 'read', subject: 'User' }, group: 'admin' },
  company: { name: 'Company Details', icon: BuildingIcon, path: '/dashboard/company', permission: { action: 'manage', subject: 'Settings' }, group: 'admin' },
  discounts: { name: 'Discount Campaigns', icon: PercentIcon, path: '/dashboard/discounts', permission: { action: 'manage', subject: 'Settings' }, group: 'admin' },
  settings: { name: 'General Settings', icon: Settings, path: '/dashboard/settings', permission: { action: 'manage', subject: 'Settings' }, group: 'admin' },
};


const Sidebar = ({ initialUser }: { initialUser: AuthUser }) => {
    const pathname = usePathname();
    const dispatch: AppDispatch = useDispatch();
    const router = useRouter();
    const { can } = usePermissions();

    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
    
    useEffect(() => {
        if (initialUser) {
          dispatch(setUser(initialUser));
        }
    }, [dispatch, initialUser]);

    const currentUser = useSelector(selectCurrentUser);

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

    const mainGroupViews = visibleViews.filter(v => viewConfig[v].group === 'main');
    const otherGroupViews = visibleViews.filter(v => viewConfig[v].group !== 'main');

    if (!currentUser) {
        return <div className="w-64 bg-card p-4"><p>Loading...</p></div>;
    }

    return (
        <TooltipProvider>
            <aside className="w-64 flex-shrink-0 bg-card p-4 flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-primary" />
                        </div>
                        <span className="font-semibold text-lg text-foreground">Dashboard</span>
                    </div>
                    <nav className="space-y-2">
                        {mainGroupViews.map(key => {
                            const { name, icon: Icon, path } = viewConfig[key];
                            const isActive = pathname === path;
                            return (
                                <Tooltip key={key}>
                                    <TooltipTrigger asChild>
                                        <Link href={path}>
                                            <Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start gap-2">
                                                <Icon className="h-5 w-5" />
                                                <span>{name}</span>
                                            </Button>
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right"><p>{name}</p></TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </nav>
                </div>

                <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
                    <div className="space-y-2">
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" className="w-full justify-start gap-2">
                                    <Settings className="h-5 w-5" />
                                    <span>Settings</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right"><p>Settings</p></TooltipContent>
                        </Tooltip>
                        <AlertDialogTrigger asChild>
                             <Button variant="ghost" className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-destructive/20">
                                <LogOut className="h-5 w-5" />
                                <span>Logout</span>
                            </Button>
                        </AlertDialogTrigger>
                    </div>
                     <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                            <AlertDialogDescription>
                                How would you like to proceed? Your current shift will remain open unless you end it.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
                            <Button onClick={() => { router.push('/dashboard/cash-register'); setIsLogoutDialogOpen(false); }} className="w-full justify-center">
                                <DoorClosed className="mr-2 h-4 w-4" /> Go to End Shift Page
                            </Button>
                            <Button variant="secondary" onClick={() => { handleDirectLogout(); setIsLogoutDialogOpen(false); }} className="w-full">
                                <LogOut className="mr-2 h-4 w-4" /> Logout Only (Keep Shift Open)
                            </Button>
                            <AlertDialogCancel className="w-full mt-2">Cancel</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </aside>
        </TooltipProvider>
    );
}


export default function DashboardClientLayout({
  initialUser,
  children,
}: {
  initialUser: AuthUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar initialUser={initialUser} />
      <main className="flex-1 flex flex-col">
        <header className="p-4 border-b border-border flex items-center justify-between">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search anything..." className="pl-10 bg-card border-none" />
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                     <Button variant="ghost" size="icon" className="text-muted-foreground"><Settings className="h-5 w-5"/></Button>
                     <Button variant="ghost" size="icon" className="text-muted-foreground"><UsersIcon className="h-5 w-5"/></Button>
                     <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                            {initialUser?.username ? initialUser.username.charAt(0).toUpperCase() : 'G'}
                        </AvatarFallback>
                    </Avatar>
                </div>
                <Button>Create</Button>
            </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
            {children}
        </div>
      </main>
    </div>
  );
}
