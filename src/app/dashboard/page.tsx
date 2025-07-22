
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Package, ShoppingCart, BarChart3, ReceiptText, WalletCards, Percent, TrendingUp, Users, Archive, ArchiveX, UserCog, Building, ArrowRight, ShoppingBag } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/slices/authSlice';

interface TimelineItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  link: string;
  permission: { action: string; subject: string };
  isLast?: boolean;
}

const TimelineItem = ({ icon: Icon, title, description, link, permission, isLast = false }: TimelineItemProps) => {
  const { can } = usePermissions();
  const hasAccess = can(permission.action as any, permission.subject as any);

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="relative flex items-start group">
      <div className="flex flex-col items-center mr-3">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 border-2 border-primary/20 group-hover:bg-primary/20 group-hover:border-primary transition-all duration-300">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        {!isLast && <div className="w-px h-full bg-border/40" />}
      </div>
      <div className="bg-gradient-to-br from-card to-background border border-border/40 rounded-lg p-2.5 group-hover:border-primary/40 transition-all duration-300 flex-1 flex flex-col mb-3">
        <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground flex-grow">{description}</p>
        <Button asChild variant="outline" size="sm" className="mt-2.5 rounded-full self-start h-7 px-2.5 text-xs">
          <Link href={link}>
            Go to Page <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
};


export default function WelcomePage() {
    const currentUser = useSelector(selectCurrentUser);
    const timelineItems: Omit<TimelineItemProps, 'isLast'>[] = [
        { 
            icon: Package, 
            title: "Product Management (නිෂ්පාදන කළමනාකරණය)", 
            description: "Add, edit, and manage all your products, their prices, and stock levels. Example: Adding a new type of soap to the system.", 
            link: "/dashboard/products", 
            permission: { action: 'read', subject: 'Product' } 
        },
        { 
            icon: ShoppingCart, 
            title: "Purchases (GRN) (මිලදී ගැනීම්)", 
            description: "Record incoming goods from suppliers to update stock levels and cost prices automatically. Example: Logging a shipment of 10 Sunlight soap boxes.", 
            link: "/dashboard/purchases", 
            permission: { action: 'read', subject: 'PurchaseBill' } 
        },
        { 
            icon: BarChart3, 
            title: "Reports (වාර්තා)", 
            description: "Generate detailed reports on sales, profits, expenses, and inventory to understand your business performance.", 
            link: "/dashboard/reports", 
            permission: { action: 'access', subject: 'Dashboard' } 
        },
        { 
            icon: ReceiptText, 
            title: "Credit Management (ණය කළමනාකරණය)", 
            description: "Manage credit sales and track payments from customers who have purchased on credit. Example: Recording a Rs. 500 payment for Kamal's bill.", 
            link: "/dashboard/credit-management", 
            permission: { action: 'read', subject: 'Sale' } 
        },
        { 
            icon: WalletCards, 
            title: "Cash Register (මුදල් ලාච්චුව)", 
            description: "Start and end your daily shifts by recording the cash in your drawer. Example: Entering the opening balance to start the day.", 
            link: "/dashboard/cash-register", 
            permission: { action: 'access', subject: 'CashRegister' } 
        },
        { 
            icon: Building, 
            title: "Company Details (සමාගමේ විස්තර)", 
            description: "Set up your company's name, address, phone number, and logo to be printed on receipts and invoices.", 
            link: "/dashboard/company", 
            permission: { action: 'manage', subject: 'Settings' } 
        },
        { 
            icon: Percent, 
            title: "Discount Management (වට්ටම් කළමනාකරණය)", 
            description: "Create and manage various discount campaigns and offers for your store. Example: Setting up a 'Buy 2 Get 1 Free' offer.", 
            link: "/dashboard/discounts", 
            permission: { action: 'manage', subject: 'Settings' } 
        },
        { 
            icon: TrendingUp, 
            title: "Income & Expense (ආදායම් සහ වියදම්)", 
            description: "Record all other business incomes and expenses like rent, salaries, and utility bills for accurate profit calculation.", 
            link: "/dashboard/financials", 
            permission: { action: 'manage', subject: 'Settings' } 
        },
        { 
            icon: Users, 
            title: "Contacts Management (සම්බන්ධතා)", 
            description: "Manage the information of your customers and suppliers, including their names, addresses, and phone numbers.", 
            link: "/dashboard/parties", 
            permission: { action: 'read', subject: 'Party' } 
        },
        { 
            icon: Archive, 
            title: "Stock Levels (තොග මට්ටම්)", 
            description: "View and adjust stock levels for all products in one place. Example: Checking the remaining quantity of Signal toothpaste.", 
            link: "/dashboard/stock", 
            permission: { action: 'read', subject: 'Product' } 
        },
        { 
            icon: ArchiveX, 
            title: "Stock Adjustments (තොග ගැලපීම්)", 
            description: "Record expired, damaged, or lost stock to maintain accurate inventory levels. Example: Removing 2 broken biscuit packets from stock.", 
            link: "/dashboard/lost-damage", 
            permission: { action: 'update', subject: 'Product' } 
        },
        { 
            icon: UserCog, 
            title: "Users & Roles (පරිශීලකයින් සහ භූමිකා)", 
            description: "Create user accounts for employees and control their access levels with permissions. Example: Creating a 'Cashier' role with sale-only access.", 
            link: "/dashboard/users", 
            permission: { action: 'read', subject: 'User' } 
        },
    ];
    
  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 bg-gradient-to-br from-background to-secondary text-foreground">
      <header className="mb-6 md:mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
            <Home className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">
            Welcome to Aronium Dashboard
            </h1>
        </div>
        <Button asChild>
          <Link href="/">
            <ShoppingBag className="mr-2 h-5 w-5" /> Go to POS
          </Link>
        </Button>
      </header>
      <div className="flex-1 rounded-lg bg-card/50 p-6 border border-border/30 shadow-xl">
        <h2 className="text-2xl font-semibold text-card-foreground">Hello, {currentUser?.username || 'User'}!</h2>
        <p className="text-muted-foreground mt-2 mb-8">
          Here is a roadmap of the features available to you for managing your business.
        </p>
        <div className="space-y-0">
          {timelineItems.map((item, index) => (
            <TimelineItem key={index} {...item} isLast={index === timelineItems.length - 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
