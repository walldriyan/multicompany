'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Home, Package, ShoppingCart, BarChart3, ReceiptText, WalletCards, Percent, TrendingUp, Users, Archive, ArchiveX, UserCog, Building, ArrowRight, ShoppingBag } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/slices/authSlice';

interface TimelineItemProps {
  icon: React.ElementType;
  englishTitle: string;
  imageUrl: string;
  imageHint: string;
  title: string;
  description: string;
  link: string;
  permission: { action: string; subject: string };
}

const TimelineItem = ({ icon: Icon, englishTitle, imageUrl, imageHint, title, description, link, permission }: TimelineItemProps) => {
  const { can } = usePermissions();
  const hasAccess = can(permission.action as any, permission.subject as any);

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="flex items-start space-x-4 group">
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/30 group-hover:bg-primary/20 group-hover:border-primary transition-all duration-300">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="w-px h-full bg-border group-last:hidden"></div>
      </div>
      <div className="flex-1 pb-12">
        <div className="bg-card/50 border border-border/50 rounded-xl p-4 group-hover:border-primary/50 transition-all duration-300">
            <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Left side: Image */}
                <div className="w-full md:w-[300px] flex-shrink-0">
                    <div className="relative aspect-[3/2] rounded-lg overflow-hidden">
                        <Image
                            src={imageUrl}
                            alt={englishTitle}
                            layout="fill"
                            objectFit="cover"
                            className="group-hover:scale-105 transition-transform duration-500"
                            data-ai-hint={imageHint}
                        />
                    </div>
                </div>
                {/* Right side: Details */}
                <div className="flex-1">
                    <p className="text-sm font-semibold text-muted-foreground">{englishTitle}</p>
                    <h3 className="text-xl font-semibold text-card-foreground mt-1">{title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                    <Button asChild variant="outline" className="mt-4 rounded-full">
                        <Link href={link}>
                            Go to Page <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};


export default function WelcomePage() {
    const currentUser = useSelector(selectCurrentUser);
    const timelineItems: TimelineItemProps[] = [
        { 
            icon: Package, 
            englishTitle: "Product Management",
            imageUrl: "https://placehold.co/300x200.png",
            imageHint: "inventory products",
            title: "නිෂ්පාදන කළමනාකරණය", 
            description: "ඔබේ සියලුම භාණ්ඩ, ඒවායේ මිල ගණන් සහ තොග ප්‍රමාණයන් මෙතැනින් කළමනාකරණය කරන්න. උදා: පද්ධතියට නව සබන් වර්ගයක් ඇතුළත් කිරීම, එහි මිල වෙනස් කිරීම.", 
            link: "/dashboard/products", 
            permission: { action: 'read', subject: 'Product' } 
        },
        { 
            icon: ShoppingCart, 
            englishTitle: "Purchases (GRN)",
            imageUrl: "https://placehold.co/300x200.png",
            imageHint: "receiving goods",
            title: "මිලදී ගැනීම් (GRN)", 
            description: "සැපයුම්කරුවන්ගෙන් ලැබෙන භාණ්ඩ, බිල්පත් සමඟ පද්ධතියට ඇතුළත් කරන්න. මෙමගින්, තොග ප්‍රමාණයන් සහ භාණ්ඩ වල ගැනුම් මිල ස්වයංක්‍රීයව යාවත්කාලීන වේ. උදා: 'Sunlight' සබන් පෙට්ටි 10ක් ලැබීම සටහන් කිරීම.", 
            link: "/dashboard/purchases", 
            permission: { action: 'read', subject: 'PurchaseBill' } 
        },
        { 
            icon: BarChart3, 
            englishTitle: "Reports",
            imageUrl: "https://placehold.co/300x200.png",
            imageHint: "charts graphs",
            title: "වාර්තා", 
            description: "විකුණුම්, ලාභ, වියදම් සහ තොග පිළිබඳ සවිස්තරාත්මක වාර්තා ලබාගන්න. එමගින්, ඔබගේ ව්‍යාපාරයේ වර්ධනය සහ මූල්‍ය තත්වය, පහසුවෙන් තේරුම් ගත හැක.", 
            link: "/dashboard/reports", 
            permission: { action: 'access', subject: 'Dashboard' } 
        },
        { 
            icon: ReceiptText, 
            englishTitle: "Credit Management",
            imageUrl: "https://placehold.co/300x200.png",
            imageHint: "payment records",
            title: "ණය කළමනාකරණය", 
            description: "ණයට භාණ්ඩ ලබා දුන් පාරිභෝගිකයන්ගේ බිල්පත් සහ, ඔවුන් විසින් සිදුකරන ගෙවීම්, මෙතැනින් කළමනාකරණය කරන්න. උදා: කමල් මහතාගේ ණය බිලට, රු. 500ක ගෙවීමක් සටහන් කිරීම.", 
            link: "/dashboard/credit-management", 
            permission: { action: 'read', subject: 'Sale' } 
        },
        { 
            icon: WalletCards, 
            englishTitle: "Cash Register",
            imageUrl: "https://placehold.co/300x200.png",
            imageHint: "cash register",
            title: "මුදල් ලාච්චුව", 
            description: "දවසේ වැඩ ආරම්භ කිරීමට ('Start Shift') සහ අවසන් කිරීමට ('Close Shift'), මුදල් ලාච්චුවේ ගනුදෙනු සටහන් කරන්න. උදා: දවස ආරම්භයේදී, ලාච්චුවේ ඇති මුදල ඇතුළත් කර වැඩ ආරම්භ කිරීම.", 
            link: "/dashboard/cash-register", 
            permission: { action: 'access', subject: 'CashRegister' } 
        },
        { 
            icon: Percent, 
            englishTitle: "Discount Management",
            imageUrl: "https://placehold.co/300x200.png",
            imageHint: "special offer",
            title: "වට්ටම් කළමනාකරණය", 
            description: "ඔබේ ව්‍යාපාරයට ගැලපෙන පරිදි, විවිධ වට්ටම් සහ දීමනා (offers) සකස් කරන්න. උදා: 'Buy 2 Get 1 Free' දීමනාවක් සකස් කිරීම.", 
            link: "/dashboard/discounts", 
            permission: { action: 'manage', subject: 'Settings' } 
        },
        { 
            icon: TrendingUp, 
            englishTitle: "Income & Expense",
            imageUrl: "https://placehold.co/300x200.png",
            imageHint: "financial ledger",
            title: "ආදායම් සහ වියදම්", 
            description: "ව්‍යාපාරයේ අනෙකුත් සියලුම ආදායම් සහ වියදම් (උදා: කුලී, වැටුප්, විදුලි බිල්) මෙහි සටහන් කරන්න. මෙමගින්, ඔබගේ ලාභය නිවැරදිව ගණනය වේ.", 
            link: "/dashboard/financials", 
            permission: { action: 'manage', subject: 'Settings' } 
        },
        { 
            icon: Users, 
            englishTitle: "Contacts Management",
            imageUrl: "https://placehold.co/300x200.png",
            imageHint: "address book",
            title: "සම්බන්ධතා", 
            description: "ඔබේ පාරිභෝගිකයන්ගේ සහ සැපයුම්කරුවන්ගේ තොරතුරු (නම, ලිපිනය, දුරකථන අංකය) ඇතුළත් කර, කළමනාකරණය කරන්න.", 
            link: "/dashboard/parties", 
            permission: { action: 'read', subject: 'Party' } 
        },
        { 
            icon: Archive, 
            englishTitle: "Stock Levels",
            imageUrl: "https://placehold.co/300x200.png",
            imageHint: "warehouse shelves",
            title: "තොග මට්ටම්", 
            description: "නිෂ්පාදන වල තොග මට්ටම් එකවර බලා, අවශ්‍ය ගැලපීම් සිදු කරන්න. උදා: 'Signal' දත් බෙහෙත් කොපමණ ප්‍රමාණයක් ඉතිරිව ඇත්දැයි බැලීම.", 
            link: "/dashboard/stock", 
            permission: { action: 'read', subject: 'Product' } 
        },
        { 
            icon: ArchiveX, 
            englishTitle: "Stock Adjustments",
            imageUrl: "https://placehold.co/300x200.png",
            imageHint: "broken package",
            title: "තොග ගැලපීම්", 
            description: "කල් ඉකුත් වූ, හානි වූ හෝ නැතිවූ තොග, පද්ධතියෙන් ඉවත් කර, තොග මට්ටම් නිවැරදිව පවත්වා ගන්න. උදා: බිම වැටී බිඳුණු බිස්කට් පැකට් 2ක් තොගයෙන් ඉවත් කිරීම.", 
            link: "/dashboard/lost-damage", 
            permission: { action: 'update', subject: 'Product' } 
        },
        { 
            icon: UserCog, 
            englishTitle: "Users & Roles",
            imageUrl: "https://placehold.co/300x200.png",
            imageHint: "user permissions",
            title: "පරිශීලකයින් සහ භූමිකා", 
            description: "නව සේවකයින් සඳහා පරිශීලක ගිණුම් සාදා, ඔවුන්ට ලබා දෙන ප්‍රවේශ මට්ටම් (permissions) පාලනය කරන්න. උදා: 'Cashier' role එකක් සාදා, ඔවුන්ට විකිණීමට පමණක් අවසර දීම.", 
            link: "/dashboard/users", 
            permission: { action: 'read', subject: 'User' } 
        },
        { 
            icon: Building, 
            englishTitle: "Company Details",
            imageUrl: "https://placehold.co/300x200.png",
            imageHint: "store front",
            title: "සමාගමේ විස්තර", 
            description: "ඔබේ ව්‍යාපාරයේ නම, ලිපිනය, දුරකථන අංකය සහ ලාංඡනය (logo) වැනි තොරතුරු, බිල්පත් වල මුද්‍රණය වීම සඳහා, මෙහි සකස් කරන්න.", 
            link: "/dashboard/company", 
            permission: { action: 'manage', subject: 'Settings' } 
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
      <div className="flex-1 rounded-lg bg-card p-6 border border-border shadow-xl">
        <h2 className="text-2xl font-semibold text-card-foreground">ආයුබෝවන්, {currentUser?.username || 'User'}!</h2>
        <p className="text-muted-foreground mt-2 mb-8">
          ඔබගේ ව්‍යාපාරය පහසුවෙන් කළමනාකරණය කරගැනීම සඳහා ඇති සියලුම අංගයන් පහත දැක්වේ.
        </p>
        <div className="relative">
          <div className="absolute left-6 top-12 bottom-12 w-px bg-border"></div>
          {timelineItems.map((item, index) => (
            <TimelineItem key={index} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}
