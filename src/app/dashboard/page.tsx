
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowRight, Users, TrendingUp, ShoppingBag, DollarSign, Package, TrendingDown } from 'lucide-react';
import { getDashboardSummaryAction } from '@/app/actions/reportActions';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/slices/authSlice';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


interface DashboardData {
    totalCustomers: number;
    newCustomersToday: number;
    totalSuppliers: number;
    recentParties: { id: string; name: string; }[];
    financials: {
        totalIncome: number;
        totalExpenses: number;
        chartData: { date: string; income: number; expenses: number }[];
    }
}


export default function WelcomePage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const currentUser = useSelector(selectCurrentUser);
    const [timeFilter, setTimeFilter] = useState<'today' | 'last7days' | 'thismonth'>('last7days');

    const loadData = useCallback(async (filter: 'today' | 'last7days' | 'thismonth') => {
        if (!currentUser?.id) return;
        setIsLoading(true);
        const result = await getDashboardSummaryAction(currentUser.id, filter);
        if (result.success && result.data) {
            setData(result.data);
        }
        setIsLoading(false);
    }, [currentUser]);

    useEffect(() => {
        loadData(timeFilter);
    }, [currentUser, timeFilter, loadData]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
            <div className="rounded-lg border bg-background p-2 shadow-sm">
                <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col space-y-1">
                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                    {label}
                    </span>
                    <span className="font-bold text-muted-foreground">
                    Income:
                    </span>
                     <span className="font-bold">
                       Rs. {payload[0].value.toLocaleString()}
                    </span>
                </div>
                </div>
            </div>
            );
        }
        return null;
    };
    
    const maxIncome = useMemo(() => {
        return Math.max(...(data?.financials.chartData.map(d => d.income) || [0]));
    }, [data]);
    
    const filterLabels = {
        today: 'Today',
        last7days: 'Last 7 days',
        thismonth: 'This month'
    };

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
          <div className="flex justify-between items-start mb-4">
            <div>
              <CardTitle className="text-lg font-semibold">Product view</CardTitle>
              {isLoading ? <Skeleton className="h-10 w-24 mt-2" /> : <p className="text-4xl font-bold mt-2">Rs. {(data?.financials.totalIncome || 0).toLocaleString()}</p>}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">{filterLabels[timeFilter]}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setTimeFilter('today')}>Today</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTimeFilter('last7days')}>Last 7 days</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTimeFilter('thismonth')}>This month</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex-1 h-40">
            {isLoading ? <Skeleton className="w-full h-full" /> :
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.financials.chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
                  <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary) / 0.1)' }} />
                  <Bar dataKey="income" radius={[4, 4, 0, 0]}>
                    {data?.financials.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.income === maxIncome && maxIncome > 0 ? '#22c55e' : '#4b5563'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            }
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
