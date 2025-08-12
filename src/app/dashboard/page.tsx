
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowRight, Users, BarChart3, TrendingUp, ShoppingBag, DollarSign, Package } from 'lucide-react';
import { getDashboardSummaryAction } from '@/app/actions/reportActions';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/slices/authSlice';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardData {
    totalCustomers: number;
    newCustomersToday: number;
    totalSuppliers: number;
    totalSalesLast7Days: number;
    recentSales: { id: string; billNumber: string; customerName: string | null; totalAmount: number; }[];
    popularProducts: { id: string; name: string; totalSold: number; sellingPrice: number; }[];
    recentParties: { id: string; name: string; }[];
}


export default function WelcomePage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const currentUser = useSelector(selectCurrentUser);

    useEffect(() => {
        async function loadData() {
            if (!currentUser?.id) return;
            setIsLoading(true);
            const result = await getDashboardSummaryAction(currentUser.id);
            if (result.success && result.data) {
                setData(result.data);
            }
            setIsLoading(false);
        }
        loadData();
    }, [currentUser]);
    
  return (
    <div className="grid grid-cols-3 grid-rows-2 gap-6 h-full">

        {/* Overview Card */}
        <Card className="col-span-2 row-span-1 bg-card border-border p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <CardTitle className="text-lg font-semibold">Overview</CardTitle>
                <Button variant="outline" size="sm" className="text-xs h-7">Last 7 days</Button>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-6">
                <Card className="bg-background/40 p-4 flex flex-col justify-between">
                    <div className="flex items-center text-sm text-muted-foreground gap-2"><Users className="h-4 w-4"/> Customers</div>
                    <div>
                        {isLoading ? <Skeleton className="h-10 w-24" /> : <span className="text-4xl font-bold">{data?.totalCustomers.toLocaleString() || '0'}</span>}
                    </div>
                </Card>
                <Card className="bg-background/40 p-4 flex flex-col justify-between">
                     <div className="flex items-center text-sm text-muted-foreground gap-2"><ShoppingBag className="h-4 w-4"/> Suppliers</div>
                    <div>
                         {isLoading ? <Skeleton className="h-10 w-24" /> : <span className="text-4xl font-bold">{data?.totalSuppliers.toLocaleString() || '0'}</span>}
                    </div>
                </Card>
            </div>
            <div className="mt-6">
                 {isLoading ? <Skeleton className="h-5 w-48" /> : <p className="font-semibold">{data?.newCustomersToday || 0} new customers today!</p>}
                <p className="text-sm text-muted-foreground mb-3">Welcome to the new members of our community.</p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center -space-x-3">
                         {isLoading ? (
                             Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-10 rounded-full" />)
                         ) : (data?.recentParties || []).map((party) => (
                             <Avatar key={party.id} className="border-2 border-card">
                                <AvatarFallback>{party.name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        ))}
                    </div>
                    <Button variant="ghost" size="icon"><ArrowRight className="h-5 w-5"/></Button>
                </div>
            </div>
        </Card>
        
        {/* Devices Card */}
        <Card className="col-span-1 row-span-1 bg-card border-border p-6 flex flex-col">
            <CardTitle className="text-lg font-semibold mb-4">Devices</CardTitle>
            <div className="flex-1 flex items-center justify-center">
                 <div className="relative w-48 h-48">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path className="stroke-current text-muted-foreground/20"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none" strokeWidth="3"></path>
                        <path className="stroke-current text-green-500"
                            strokeDasharray="66, 100"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none" strokeWidth="3" strokeLinecap="round"></path>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold">12.5%</span>
                        <span className="text-muted-foreground">Mobile</span>
                    </div>
                </div>
            </div>
            <div className="flex justify-around text-xs mt-4">
                <div className="text-center"><p>Mobile</p><p className="font-semibold">15.20%</p></div>
                <div className="text-center"><p>Tablet</p><p className="font-semibold">17.1%</p></div>
                <div className="text-center"><p>Desktop</p><p className="font-semibold">66.62%</p></div>
            </div>
        </Card>
        
        {/* Product View Card */}
        <Card className="col-span-2 row-span-1 bg-card border-border p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <CardTitle className="text-lg font-semibold">Product view</CardTitle>
                <Button variant="outline" size="sm" className="text-xs h-7">Last 7 days</Button>
            </div>
            <div className="flex-1 flex flex-col justify-end">
                <div className="mb-2">
                    {isLoading ? <Skeleton className="h-10 w-32" /> : <p className="text-4xl font-bold">Rs. {(data?.totalSalesLast7Days || 0).toLocaleString()}</p>}
                    <p className="text-sm text-green-400">Total Sales in Last 7 Days</p>
                </div>
                <div className="flex items-end justify-between h-40 gap-2">
                    <div className="w-full h-[30%] bg-muted-foreground/20 rounded-t-md"></div>
                    <div className="w-full h-[50%] bg-muted-foreground/20 rounded-t-md"></div>
                    <div className="w-full h-[40%] bg-muted-foreground/20 rounded-t-md"></div>
                    <div className="w-full h-[90%] bg-green-500 rounded-t-md"></div>
                    <div className="w-full h-[60%] bg-muted-foreground/20 rounded-t-md"></div>
                    <div className="w-full h-[35%] bg-muted-foreground/20 rounded-t-md"></div>
                    <div className="w-full h-[70%] bg-muted-foreground/20 rounded-t-md"></div>
                </div>
            </div>
        </Card>
        
        {/* Popular Products Card */}
        <Card className="col-span-1 row-span-1 bg-card border-border p-6 flex flex-col">
            <CardTitle className="text-lg font-semibold mb-4">Popular products</CardTitle>
            <div className="flex-1 space-y-4">
                {isLoading ? (
                     Array.from({ length: 4 }).map((_, i) => (
                         <div key={i} className="flex items-center gap-4">
                            <Skeleton className="w-10 h-10 rounded-md" />
                            <div className="flex-1 space-y-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/4" /></div>
                            <Skeleton className="h-5 w-16" />
                        </div>
                     ))
                ) : (data?.popularProducts || []).map((product) => (
                    <div key={product.id} className="flex items-center gap-4">
                        <Avatar className="w-10 h-10 rounded-md bg-muted"><Package /></Avatar>
                        <div className="flex-1">
                            <p className="font-semibold text-sm truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">Sold: {product.totalSold} units</p>
                        </div>
                        <p className="font-semibold text-sm">Rs. {product.sellingPrice.toFixed(2)}</p>
                    </div>
                ))}
            </div>
             <Button variant="outline" className="w-full mt-4">All products</Button>
        </Card>

    </div>
  );
}

    