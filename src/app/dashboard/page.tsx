
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowRight, Users, TrendingUp, ShoppingBag, DollarSign, Package, TrendingDown } from 'lucide-react';
import { getDashboardSummaryAction } from '@/app/actions/reportActions';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/slices/authSlice';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


interface DashboardData {
    totalCustomers: number;
    newCustomersToday: number;
    totalSuppliers: number;
    recentParties: { id: string; name: string; }[];
    last7DaysFinancials: {
        totalIncome: number;
        totalExpenses: number;
        chartData: { date: string; income: number; expenses: number }[];
    }
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
                <p className="text-sm text-muted-foreground mb-3">Recent activity in contacts.</p>
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
        
        {/* Income & Expense Card */}
        <Card className="col-span-2 row-span-1 bg-card border-border p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <CardTitle className="text-lg font-semibold">Income &amp; Expenses (Last 7 Days)</CardTitle>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-6">
                <div className="col-span-1 flex flex-col justify-end gap-6">
                     <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                         <div className="flex items-center text-sm text-green-300 gap-2"><TrendingUp className="h-4 w-4"/> Total Income</div>
                         {isLoading ? <Skeleton className="h-8 w-24 mt-1" /> : <p className="text-2xl font-bold text-green-400">Rs. {(data?.last7DaysFinancials.totalIncome || 0).toLocaleString()}</p>}
                    </div>
                     <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                         <div className="flex items-center text-sm text-red-300 gap-2"><TrendingDown className="h-4 w-4"/> Total Expenses</div>
                         {isLoading ? <Skeleton className="h-8 w-24 mt-1" /> : <p className="text-2xl font-bold text-red-400">Rs. {(data?.last7DaysFinancials.totalExpenses || 0).toLocaleString()}</p>}
                    </div>
                </div>
                <div className="col-span-2 h-40">
                   {isLoading ? <Skeleton className="w-full h-full" /> :
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data?.last7DaysFinancials.chartData} margin={{ top: 5, right: 10, left: -20, bottom: -5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                            <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted-foreground) / 0.1)' }}
                                contentStyle={{ 
                                    backgroundColor: 'hsl(var(--background) / 0.9)', 
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '0.5rem',
                                    fontSize: '12px'
                                }}
                            />
                            <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} barSize={20} />
                            <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>}
                </div>
            </div>
        </Card>
        
        {/* Popular Products Card */}
        <Card className="col-span-1 row-span-1 bg-card border-border p-6 flex flex-col">
            <CardTitle className="text-lg font-semibold mb-4">Popular products</CardTitle>
            <div className="flex-1 space-y-4">
                 <p className="text-muted-foreground text-sm text-center py-10">This section is under construction.</p>
            </div>
             <Button variant="outline" className="w-full mt-4" disabled>All products</Button>
        </Card>

    </div>
  );
}
