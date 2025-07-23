
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Package, ShoppingCart, BarChart3, ReceiptText, WalletCards, Percent, TrendingUp, Users, Archive, ArchiveX, UserCog, Building, ArrowRight, ShoppingBag } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/slices/authSlice';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface WidgetProps {
  icon: React.ElementType;
  title: string;
  description: string;
  link: string;
  permission: { action: string; subject: string };
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const Widget = ({ icon: Icon, title, description, link, permission, className = '', size = 'medium' }: WidgetProps) => {
  const { can } = usePermissions();
  const hasAccess = can(permission.action as any, permission.subject as any);

  if (!hasAccess) {
    return null;
  }

  const sizeClasses = {
    small: 'md:col-span-1',
    medium: 'md:col-span-1',
    large: 'md:col-span-2',
  };

  return (
    <div className={cn(
      "relative group rounded-2xl md:rounded-3xl p-4 flex flex-col justify-between bg-card/40 dark:bg-card/60 border border-border/30 overflow-hidden hover:border-primary",
      sizeClasses[size],
      className
    )}>
      <div className="flex flex-col flex-grow">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 mb-3">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground flex-grow">{description}</p>
      </div>
      <Button asChild variant="secondary" size="sm" className="mt-4 rounded-full self-start h-8 px-3 text-xs bg-primary/10 hover:bg-primary/20 text-primary-foreground border border-primary/20">
        <Link href={link}>
          Go to Page <ArrowRight className="ml-1.5 h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
};


export default function WelcomePage() {
    const currentUser = useSelector(selectCurrentUser);
    const widgetItems: Omit<WidgetProps, 'isLast'>[] = [
        { 
            icon: Package, 
            title: "Product Management", 
            description: "Add, edit, and manage all your products, their prices, and stock levels.", 
            link: "/dashboard/products", 
            permission: { action: 'read', subject: 'Product' },
            size: 'large',
        },
        { 
            icon: ShoppingCart, 
            title: "Purchases (GRN)", 
            description: "Record incoming goods from suppliers to update stock levels.", 
            link: "/dashboard/purchases", 
            permission: { action: 'read', subject: 'PurchaseBill' },
            size: 'medium',
        },
        { 
            icon: BarChart3, 
            title: "Reports", 
            description: "Generate detailed reports on sales, profits, and inventory.", 
            link: "/dashboard/reports", 
            permission: { action: 'access', subject: 'Dashboard' },
            size: 'medium',
        },
        { 
            icon: ReceiptText, 
            title: "Credit Management", 
            description: "Manage credit sales and track payments from customers.", 
            link: "/dashboard/credit-management", 
            permission: { action: 'read', subject: 'Sale' },
            size: 'medium',
        },
        { 
            icon: WalletCards, 
            title: "Cash Register", 
            description: "Start and end your daily shifts by recording cash flow.", 
            link: "/dashboard/cash-register", 
            permission: { action: 'access', subject: 'CashRegister' },
            size: 'medium',
        },
        { 
            icon: Building, 
            title: "Company Details", 
            description: "Set up your company's name, address, and logo for receipts.", 
            link: "/dashboard/company", 
            permission: { action: 'manage', subject: 'Settings' },
            size: 'small',
        },
        { 
            icon: Percent, 
            title: "Discount Management", 
            description: "Create and manage discount campaigns for your store.", 
            link: "/dashboard/discounts", 
            permission: { action: 'manage', subject: 'Settings' },
            size: 'small',
        },
        { 
            icon: TrendingUp, 
            title: "Income & Expense", 
            description: "Record other business incomes and expenses like rent or bills.", 
            link: "/dashboard/financials", 
            permission: { action: 'manage', subject: 'Settings' },
            size: 'small',
        },
        { 
            icon: Users, 
            title: "Contacts Management", 
            description: "Manage your customers and suppliers information.", 
            link: "/dashboard/parties", 
            permission: { action: 'read', subject: 'Party' },
            size: 'small',
        },
        { 
            icon: Archive, 
            title: "Stock Levels", 
            description: "View and adjust stock levels for all products in one place.", 
            link: "/dashboard/stock", 
            permission: { action: 'read', subject: 'Product' },
            size: 'large'
        },
        { 
            icon: ArchiveX, 
            title: "Stock Adjustments", 
            description: "Record expired, damaged, or lost stock.", 
            link: "/dashboard/lost-damage", 
            permission: { action: 'update', subject: 'Product' },
            size: 'medium',
        },
        { 
            icon: UserCog, 
            title: "Users & Roles", 
            description: "Create user accounts for employees and control their access.", 
            link: "/dashboard/users", 
            permission: { action: 'read', subject: 'User' },
            size: 'medium',
        },
    ];
    
  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 bg-gradient-to-br from-background to-secondary text-foreground">
      <header className="mb-6 md:mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
            <Home className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">
              Welcome, {currentUser?.username || 'User'}!
            </h1>
        </div>
        <Button asChild>
          <Link href="/">
            <ShoppingBag className="mr-2 h-5 w-5" /> Go to POS
          </Link>
        </Button>
      </header>
      <div className="relative flex-1 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-border/10 shadow-xl overflow-hidden">
        <Image
            src="https://placehold.co/1200x800.png"
            alt="Dashboard background"
            layout="fill"
            objectFit="cover"
            className="absolute inset-0 w-full h-full -z-10"
            data-ai-hint="abstract gradient"
        />
        <div className="absolute inset-0 w-full h-full bg-black/50 -z-10"></div>

        <h2 className="text-2xl font-semibold text-card-foreground mb-1">Control Center</h2>
        <p className="text-muted-foreground mb-6">
          Here is a roadmap of the features available to you for managing your business.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {widgetItems.map((item, index) => (
            <Widget key={index} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}
