
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowRight, Users, BarChart3, TrendingUp } from 'lucide-react';

export default function WelcomePage() {
    
  // Placeholder data to match the design
  const customerCount = 1293;
  const balance = "256k";
  const newCustomers = [
    { name: "Gladyce", image: "https://placehold.co/40x40.png", hint: "woman" },
    { name: "Elbert", image: "https://placehold.co/40x40.png", hint: "man" },
    { name: "Joyce", image: "https://placehold.co/40x40.png", hint: "woman portrait" },
    { name: "Joyce", image: "https://placehold.co/40x40.png", hint: "man portrait" },
    { name: "Joyce", image: "https://placehold.co/40x40.png", hint: "person" },
  ];
  const popularProducts = [
      { name: "Crypter - NFT UI Kit", price: "$3,250.00", status: "Active", image: "https://placehold.co/40x40.png", hint: "abstract art" },
      { name: "Bento Pro 2.0 Illustrations", price: "$7,890.00", status: "Active", image: "https://placehold.co/40x40.png", hint: "geometric shapes" },
      { name: "Fleet - travel shopping kit", price: "$1,500.00", status: "Offline", image: "https://placehold.co/40x40.png", hint: "leather bag" },
      { name: "SimpleSocial UI Design Kit", price: "$4,750.00", status: "Active", image: "https://placehold.co/40x40.png", hint: "sunset landscape" },
  ];

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
                        <span className="text-4xl font-bold">1,293</span>
                        <span className="ml-2 text-sm text-red-400 flex items-center">↓ 36.8% <span className="text-muted-foreground ml-1">vs last month</span></span>
                    </div>
                </Card>
                <Card className="bg-background/40 p-4 flex flex-col justify-between">
                     <div className="flex items-center text-sm text-muted-foreground gap-2"><TrendingUp className="h-4 w-4"/> Balance</div>
                    <div>
                        <span className="text-4xl font-bold">$256k</span>
                        <span className="ml-2 text-sm text-green-400 flex items-center">↑ 36.8% <span className="text-muted-foreground ml-1">vs last month</span></span>
                    </div>
                </Card>
            </div>
            <div className="mt-6">
                <p className="font-semibold">857 new customers today!</p>
                <p className="text-sm text-muted-foreground mb-3">Send a welcome message to all new customers.</p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center -space-x-3">
                        {newCustomers.map((customer, index) => (
                             <Avatar key={index} className="border-2 border-card">
                                <img src={customer.image} alt={customer.name} data-ai-hint={customer.hint} />
                                <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
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
                <div className="mb-2"><p className="text-4xl font-bold">$10.2m</p><p className="text-sm text-green-400">↑ 36.8% vs last month</p></div>
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
                {popularProducts.map((product, index) => (
                    <div key={index} className="flex items-center gap-4">
                        <img src={product.image} alt={product.name} className="w-10 h-10 rounded-md" data-ai-hint={product.hint}/>
                        <div className="flex-1">
                            <p className="font-semibold text-sm">{product.name}</p>
                            <p className={`text-xs ${product.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>{product.status}</p>
                        </div>
                        <p className="font-semibold text-sm">{product.price}</p>
                    </div>
                ))}
            </div>
             <Button variant="outline" className="w-full mt-4">All products</Button>
        </Card>

    </div>
  );
}
