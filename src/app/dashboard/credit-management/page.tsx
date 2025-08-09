
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getUnpaidOrPartiallyPaidPurchaseBillsAction, recordPurchasePaymentAction, getPaymentsForPurchaseBillAction, getAllSuppliersAction } from '@/app/actions/purchaseActions';
import { getOpenCreditSalesAction, recordCreditPaymentAction, getInstallmentsForSaleAction } from '@/app/actions/saleActions';
import { getAllCustomersAction } from '@/app/actions/partyActions';
import type { SaleRecord, PaymentInstallment, CreditPaymentStatus, Party as CustomerType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Search, RefreshCw, ReceiptText, DollarSign, ListChecks, Info, CheckCircle, Hourglass, Printer, CalendarIcon, Filter, X, User, ChevronsUpDown, AlertTriangle, Banknote, Landmark, WalletCards, ArrowUpCircle, ArrowDownCircle, ListFilter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditBillPrintContent } from '@/components/pos/CreditBillPrintContent';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/slices/authSlice';
import { usePermissions } from '@/hooks/usePermissions';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { addDays, format, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const ITEMS_PER_PAGE = 10;

export default function CreditManagementPage() {
  const { toast } = useToast();
  const currentUser = useSelector(selectCurrentUser);
  const { can, check } = usePermissions();
  const canUpdateSale = can('update', 'Sale');

  const isSuperAdminWithoutCompany = currentUser?.role?.name === 'Admin' && !currentUser?.companyId;

  const [openCreditSales, setOpenCreditSales] = useState<SaleRecord[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
  
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isLoadingInstallments, setIsLoadingInstallments] = useState(false);
  const [isPrintingBill, setIsPrintingBill] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'OTHER'>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Advanced Filter State
  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [activeFilters, setActiveFilters] = useState<{ customerId: string; dateRange?: DateRange }>({ customerId: 'all' });
  
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const customerSearchInputRef = useRef<HTMLInputElement>(null);


  const fetchOpenSales = useCallback(async () => {
    if (!currentUser?.id || isSuperAdminWithoutCompany) {
        setIsLoadingSales(false);
        setOpenCreditSales([]);
        setTotalCount(0);
        return;
    }
    setIsLoadingSales(true);
    const filterParams = {
        customerId: activeFilters.customerId === 'all' ? null : activeFilters.customerId,
        startDate: activeFilters.dateRange?.from ? startOfDay(activeFilters.dateRange.from) : null,
        endDate: activeFilters.dateRange?.to ? endOfDay(activeFilters.dateRange.to) : activeFilters.dateRange?.from ? endOfDay(activeFilters.dateRange.from) : null,
    };
    const result = await getOpenCreditSalesAction(currentUser.id, currentPage, ITEMS_PER_PAGE, filterParams);
    if (result.success && result.data) {
      setOpenCreditSales(result.data.sales);
      setTotalCount(result.data.totalCount);
    } else {
      toast({ title: 'Error', description: result.error || 'Could not fetch open credit sales.', variant: 'destructive' });
      setOpenCreditSales([]);
      setTotalCount(0);
    }
    setIsLoadingSales(false);
  }, [toast, currentUser?.id, activeFilters, currentPage, isSuperAdminWithoutCompany]);

  useEffect(() => {
    if (!currentUser?.id || isSuperAdminWithoutCompany) {
        setIsLoadingCustomers(false);
        setCustomers([]);
        return;
    }
    const fetchCustomers = async () => {
        setIsLoadingCustomers(true);
        const result = await getAllCustomersAction(currentUser.id);
        if (result.success && result.data) {
            setCustomers(result.data);
        } else {
            toast({ title: 'Error', description: 'Could not load customers for filter.', variant: 'destructive' });
        }
        setIsLoadingCustomers(false);
    };
    fetchCustomers();
  }, [toast, currentUser?.id, isSuperAdminWithoutCompany]);

  useEffect(() => {
    fetchOpenSales();
  }, [fetchOpenSales]);
  
  const handleApplyFilters = () => {
    setCurrentPage(1); // Reset to first page on new filter
    setActiveFilters({ customerId: selectedCustomerId, dateRange });
  };
  
  const handleClearFilters = () => {
    setSelectedCustomerId('all');
    setDateRange(undefined);
    setCurrentPage(1);
    setActiveFilters({ customerId: 'all' });
  };


  const fetchInstallments = useCallback(async (saleId: string) => {
    if (!saleId) return;
    setIsLoadingInstallments(true);
    const result = await getInstallmentsForSaleAction(saleId);
    if (result.success && result.data) {
      setInstallments(result.data);
    } else {
      setInstallments([]);
      toast({ title: 'Error', description: result.error || 'Could not fetch payment history.', variant: 'destructive' });
    }
    setIsLoadingInstallments(false);
  }, [toast]);

  useEffect(() => {
    if (selectedSale) {
      fetchInstallments(selectedSale.id);
    } else {
      setInstallments([]);
    }
  }, [selectedSale, fetchInstallments]);

  const handleSelectSale = (sale: SaleRecord) => {
    setSelectedSale(sale);
    setPaymentAmount('');
    setPaymentMethod('CASH');
    setPaymentNotes('');
  };

  const handleRecordPayment = async () => {
    const { permitted, toast: permissionToast } = check('update', 'Sale');
    if (!permitted) {
        permissionToast();
        return;
    }
    if (!currentUser?.id) {
        toast({ title: 'Authentication Error', description: 'You must be logged in to record a payment.', variant: 'destructive' });
        return;
    }
    if (!selectedSale || !paymentAmount) {
      toast({ title: 'Validation Error', description: 'Please select a sale and enter payment amount.', variant: 'destructive' });
      return;
    }
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Validation Error', description: 'Invalid payment amount.', variant: 'destructive' });
      return;
    }
    if (amount > (selectedSale.creditOutstandingAmount ?? 0) + 0.01) { // Add a small tolerance
      toast({ title: 'Validation Error', description: `Payment cannot exceed outstanding Rs. ${(selectedSale.creditOutstandingAmount ?? 0).toFixed(2)}.`, variant: 'destructive' });
      return;
    }

    setIsProcessingPayment(true);
    const result = await recordCreditPaymentAction(selectedSale.id, amount, paymentMethod, currentUser.id, paymentNotes);
    if (result.success && result.data) {
      toast({ title: 'Payment Recorded', description: `Payment of Rs. ${amount.toFixed(2)} for bill ${selectedSale.billNumber} recorded.` });
      fetchOpenSales();
      setSelectedSale(result.data); 
      setPaymentAmount('');
      setPaymentNotes('');
    } else {
      toast({ title: 'Error Recording Payment', description: result.error || 'Could not record payment.', variant: 'destructive' });
    }
    setIsProcessingPayment(false);
  };

  const handlePrintFullBill = () => {
    if (!selectedSale) {
      toast({ title: "Error", description: "No sale selected to print.", variant: "destructive" });
      return;
    }
    setIsPrintingBill(true);

    setTimeout(() => {
      const printContentHolder = document.getElementById('printable-credit-bill-holder');
      if (!printContentHolder) {
        console.error('Credit bill print content holder not found.');
        toast({ title: "Print Error", description: "Receipt content area not found.", variant: "destructive" });
        setIsPrintingBill(false);
        return;
      }

      const printContents = printContentHolder.innerHTML;
      if (!printContents || printContents.trim() === "") {
          console.error('Credit bill content holder is empty.');
          toast({ title: "Print Error", description: "No content generated for the receipt.", variant: "destructive" });
          setIsPrintingBill(false);
          return;
      }

      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = '0';
      iframe.setAttribute('title', `Print Bill ${selectedSale.billNumber}`);
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        const printHtml = `
          <html>
          <head>
              <title>Credit Bill - ${selectedSale.billNumber}</title>
              <style>
                  @page { size: auto; margin: 5px; }
                  body { margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 8pt; background-color: white; color: black; height: fit-content; }
                  .receipt-container { width: 100%; margin: 0; padding: 0; height: fit-content; }
                  table { width: 100%; border-collapse: collapse; font-size: 7pt; margin-bottom: 3px; }
                  th, td { padding: 1px 2px; vertical-align: top; }
                  .text-left { text-align: left; } .text-right { text-align: right; } .text-center { text-align: center; }
                  .font-bold { font-weight: bold; }
                  .company-details p, .header-info p, .customer-name, .section-title { margin: 2px 0; font-size: 8pt; }
                  .company-details h3 { font-size: 10pt; margin: 1px 0;}
                  .item-name { word-break: break-all; max-width: 100px; } 
                  .col-price { max-width: 45px; } .col-discount { max-width: 40px; } .col-total { max-width: 50px; }
                  hr.separator { border: none; border-top: 1px dashed black; margin: 3px 0; }
                  .totals-section div { display: flex; justify-content: space-between; padding: 0px 0; font-size: 8pt; }
                  .totals-section .value { text-align: right; }
                  .thank-you { margin-top: 5px; text-align: center; font-size: 8pt; }
                  .section-break { margin-top: 5px; margin-bottom: 5px; }
                  @media print {
                      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 8pt !important; color: black !important; background-color: white !important; height: auto !important; }
                      .receipt-container { margin: 0; padding:0; width: 100%; height: fit-content !important; }
                      table { font-size: 7pt !important; }
                  }
              </style>
          </head>
          <body><div class="receipt-container">${printContents}</div></body>
          </html>
        `;
        iframeDoc.open();
        iframeDoc.write(printHtml);
        iframeDoc.close();
        
        if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } else {
            console.error("Iframe contentWindow became null before print.");
            toast({ title: "Print Error", description: "Failed to access iframe for printing.", variant: "destructive" });
        }
      } else {
        console.error("Could not get iframe document for printing.");
        toast({ title: "Print Error", description: "Could not prepare print document.", variant: "destructive" });
      }
      
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000); 

      setIsPrintingBill(false);
    }, 200);
  };

  const filteredSales = openCreditSales.filter(sale =>
    sale.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.customerName && sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalFilteredOutstanding = useMemo(() => {
    return filteredSales.reduce((sum, sale) => sum + (sale.creditOutstandingAmount ?? 0), 0);
  }, [filteredSales]);


  const getStatusBadgeVariant = (status?: CreditPaymentStatus | null) => {
    if (status === 'PENDING') return 'destructive';
    if (status === 'PARTIALLY_PAID') return 'secondary';
    if (status === 'FULLY_PAID') return 'default'; 
    return 'outline';
  };
  
  const totalPaidForSelectedSale = useMemo(() => {
      if (!selectedSale) return 0;
      return installments.reduce((sum, inst) => sum + inst.amountPaid, 0);
  }, [installments, selectedSale]);

  const maxPage = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const filteredCustomersForDropdown = useMemo(() => {
    if (!customerSearchTerm) {
      return customers;
    }
    const lowerCaseSearch = customerSearchTerm.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(lowerCaseSearch) ||
      (c.phone && c.phone.includes(customerSearchTerm))
    );
  }, [customers, customerSearchTerm]);

  return (
    <>
      <div className="flex flex-col h-full p-4 md:p-6 bg-gradient-to-br from-background to-secondary text-foreground">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center">
            <ReceiptText className="mr-3 h-7 w-7" />
            Credit Management
          </h1>
          <Button onClick={() => fetchOpenSales()} variant="outline" disabled={isLoadingSales} className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingSales ? 'animate-spin' : ''}`} /> Refresh List
          </Button>
        </header>
        
        {isSuperAdminWithoutCompany && (
          <Card className="mb-4 border-yellow-500/50 bg-yellow-950/30">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-yellow-400" />
              <div>
                <p className="font-semibold text-yellow-300">Super Admin Notice</p>
                <p className="text-xs text-yellow-400">
                  Credit management is company-specific. To use this feature, please ensure your Super Admin account is associated with a company in the User Management settings.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-1 gap-4 overflow-hidden" >
            <Card className="w-1/2 lg:w-2/5 flex flex-col bg-card border-border shadow-lg">
              <CardHeader>
                <CardTitle className="text-card-foreground">Search & Filter Bills</CardTitle>
                <Card className="p-3 bg-muted/30 mt-2 border-border/50">
                    <CardDescription className="mb-2 text-muted-foreground">Filter by Date &amp; Customer</CardDescription>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="grid gap-1">
                          <Label htmlFor="date-filter" className="text-xs">Date Range</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button id="date-filter" variant="outline" className={cn("w-full justify-start text-left font-normal bg-input border-border", !dateRange && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/></PopoverContent>
                          </Popover>
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="customer-filter" className="text-xs">Customer</Label>
                        <Popover open={isCustomerPopoverOpen} onOpenChange={(open) => {
                            setIsCustomerPopoverOpen(open);
                            if(open) setTimeout(() => customerSearchInputRef.current?.focus(), 100);
                        }}>
                            <PopoverTrigger asChild>
                              <Button
                                id="customer-filter"
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between bg-input border-border font-normal"
                                disabled={isLoadingCustomers}
                              >
                                <span className="truncate">
                                  {selectedCustomerId === 'all'
                                    ? 'All Customers'
                                    : customers.find(c => c.id === selectedCustomerId)?.name || 'Select customer...'}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <div className="p-2">
                                    <Input
                                        ref={customerSearchInputRef}
                                        placeholder="Search customer..."
                                        value={customerSearchTerm}
                                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                        className="h-9"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                let customerToFilterBy = selectedCustomerId;
                                                if (filteredCustomersForDropdown.length === 1) {
                                                    customerToFilterBy = filteredCustomersForDropdown[0].id;
                                                    setSelectedCustomerId(customerToFilterBy);
                                                }
                                                setCurrentPage(1);
                                                setActiveFilters({ customerId: customerToFilterBy, dateRange });
                                                setIsCustomerPopoverOpen(false);
                                            }
                                        }}
                                    />
                                </div>
                              <ScrollArea className="max-h-60">
                                <div className="p-1">
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start"
                                        onClick={() => {
                                            setSelectedCustomerId('all');
                                            setIsCustomerPopoverOpen(false);
                                            setCustomerSearchTerm('');
                                        }}
                                    >
                                        All Customers
                                    </Button>
                                    {filteredCustomersForDropdown.map(c => (
                                        <Button
                                            key={c.id}
                                            variant="ghost"
                                            className="w-full justify-start text-left h-auto py-1.5"
                                            onClick={() => {
                                                setSelectedCustomerId(c.id);
                                                setIsCustomerPopoverOpen(false);
                                                setCustomerSearchTerm('');
                                            }}
                                        >
                                            <div className="flex flex-col">
                                                <span>{c.name}</span>
                                                {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                                            </div>
                                        </Button>
                                    ))}
                                </div>
                                {filteredCustomersForDropdown.length === 0 && customerSearchTerm && (
                                    <p className="p-2 text-center text-sm text-muted-foreground">No customer found.</p>
                                )}
                              </ScrollArea>
                            </PopoverContent>
                          </Popover>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                        <Button onClick={handleClearFilters} variant="ghost" size="sm" className="text-xs"><X className="mr-1 h-3 w-3" />Clear</Button>
                        <Button onClick={handleApplyFilters} size="sm" className="text-xs"><Filter className="mr-1 h-3 w-3" />Apply Filters</Button>
                    </div>
                </Card>
                <div className="relative mt-4">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Quick-search by Bill ID or Customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-input border-border focus:ring-primary text-card-foreground"
                  />
                </div>
              </CardHeader>
               <Accordion type="single" collapsible defaultValue="item-1" className="w-full px-4 pb-2">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="hover:no-underline"><div className="flex items-center"><ListFilter className="mr-2 h-4 w-4" /> Open Credit Bills</div></AccordionTrigger>
                  <AccordionContent>
                      <CardContent className="flex-1 overflow-hidden p-0 mt-2">
                        <ScrollArea className="h-[40vh]">
                          {isLoadingSales ? (
                            <div className="p-4 text-center text-muted-foreground">Loading credit sales...</div>
                          ) : filteredSales.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No open credit sales matching criteria.</div>
                          ) : (
                            <Table>
                              <TableHeader className="sticky top-0 bg-card z-10">
                                <TableRow>
                                  <TableHead className="text-muted-foreground">Date</TableHead>
                                  <TableHead className="text-muted-foreground">Bill ID</TableHead>
                                  <TableHead className="text-muted-foreground">Customer</TableHead>
                                  <TableHead className="text-muted-foreground">User</TableHead>
                                  <TableHead className="text-right text-muted-foreground">Outstanding</TableHead>
                                  <TableHead className="text-center text-muted-foreground">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredSales.map((sale) => (
                                  <TableRow
                                    key={sale.id}
                                    onClick={() => handleSelectSale(sale)}
                                    className={`cursor-pointer hover:bg-muted/50 ${selectedSale?.id === sale.id ? 'bg-primary/10' : ''}`}
                                  >
                                    <TableCell className="text-card-foreground text-xs py-2">{new Date(sale.date).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-card-foreground text-xs py-2">{sale.billNumber}</TableCell>
                                    <TableCell className="text-card-foreground text-xs py-2">{sale.customerName || 'N/A'}</TableCell>
                                    <TableCell className="text-card-foreground text-xs py-2">{sale.createdBy?.username || 'N/A'}</TableCell>
                                    <TableCell className="text-right text-card-foreground text-xs py-2">
                                      Rs. {(sale.creditOutstandingAmount ?? sale.totalAmount).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-center py-2">
                                      <Badge variant={getStatusBadgeVariant(sale.creditPaymentStatus)} className="text-xs">
                                        {sale.creditPaymentStatus ? sale.creditPaymentStatus.replace('_', ' ') : 'N/A'}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                              <TableFooter>
                                <TableRow>
                                  <TableCell colSpan={4} className="text-right font-semibold">Total Displayed Outstanding:</TableCell>
                                  <TableCell className="text-right font-bold text-red-400">Rs. {totalFilteredOutstanding.toFixed(2)}</TableCell>
                                  <TableCell className="text-center text-xs">({filteredSales.length} bills)</TableCell>
                                </TableRow>
                              </TableFooter>
                            </Table>
                          )}
                        </ScrollArea>
                      </CardContent>
                      <CardFooter className="p-2 border-t border-border/50">
                        {totalCount > 0 && (<div className="flex justify-between items-center w-full">
                            <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isLoadingSales} variant="outline" size="sm">Previous</Button>
                            <span className="text-xs text-muted-foreground">Page {currentPage} of {maxPage}</span>
                            <Button onClick={() => setCurrentPage(p => Math.min(maxPage, p + 1))} disabled={currentPage === maxPage || isLoadingSales} variant="outline" size="sm">Next</Button>
                        </div>)}
                      </CardFooter>
                   </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>

            <Card className="flex-1 flex flex-col bg-card border-border shadow-lg overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-card-foreground">
                        {selectedSale ? `Details for Bill: ${selectedSale.billNumber}` : 'Select a Bill'}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                        {selectedSale ? `Customer: ${selectedSale.customerName || 'N/A'}` : 'Select a bill from the list to view details and record payments.'}
                        </CardDescription>
                    </div>
                    {selectedSale && (
                        <Button onClick={handlePrintFullBill} variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                            <Printer className="mr-2 h-4 w-4" /> Print Full Bill
                        </Button>
                    )}
                </div>
              </CardHeader>
              <ScrollArea className="flex-1">
                <CardContent className="p-4 space-y-4">
                  {!selectedSale ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Info className="mx-auto h-10 w-10 mb-3" />
                      <p>No bill selected.</p>
                    </div>
                  ) : (
                    <>
                      <Card className="p-4 bg-muted/20 border-border/40">
                          <CardHeader className="p-0 pb-3">
                              <CardTitle className="text-lg font-medium text-foreground flex items-center">
                                  <ListChecks className="mr-2 h-5 w-5 text-primary"/>Bill Summary
                              </CardTitle>
                          </CardHeader>
                          <CardContent className="p-0 space-y-2">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div className="space-y-1 p-3 rounded-md bg-background/40">
                                      <div className="flex items-center text-muted-foreground"><ArrowUpCircle className="h-4 w-4 mr-2 text-primary/70"/> Original Total</div>
                                      <p className="font-semibold text-xl text-card-foreground">Rs. {selectedSale.totalAmount.toFixed(2)}</p>
                                  </div>
                                  <div className="space-y-1 p-3 rounded-md bg-background/40">
                                      <div className="flex items-center text-muted-foreground"><ArrowDownCircle className="h-4 w-4 mr-2 text-green-500"/> Total Paid</div>
                                      <p className="font-semibold text-2xl text-green-400">Rs. {totalPaidForSelectedSale.toFixed(2)}</p>
                                  </div>
                              </div>
                              <Separator className="bg-border/30 my-3"/>
                              <div className="space-y-1 p-3 rounded-md bg-red-950/20 border border-red-500/30">
                                  <div className="flex items-center text-muted-foreground"><Hourglass className="h-4 w-4 mr-2 text-red-500"/> Currently Outstanding</div>
                                  <p className="font-bold text-3xl text-red-400">Rs. {(selectedSale.creditOutstandingAmount ?? 0).toFixed(2)}</p>
                              </div>
                              <Separator className="bg-border/30 my-3"/>
                              <div className="space-y-1 text-xs px-1">
                                  <div className="flex justify-between items-center">
                                      <div className="flex items-center text-muted-foreground">Payment Status:</div>
                                      <Badge variant={getStatusBadgeVariant(selectedSale.creditPaymentStatus)}>{selectedSale.creditPaymentStatus || 'N/A'}</Badge>
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <div className="flex items-center text-muted-foreground">Sale Date:</div>
                                      <span className="text-card-foreground">{new Date(selectedSale.date).toLocaleDateString()}</span>
                                  </div>
                                  {selectedSale.creditLastPaymentDate && <div className="flex justify-between items-center">
                                      <div className="flex items-center text-muted-foreground">Last Payment:</div>
                                      <span className="text-card-foreground">{new Date(selectedSale.creditLastPaymentDate).toLocaleDateString()}</span>
                                  </div>}
                              </div>
                          </CardContent>
                      </Card>

                      {selectedSale.creditPaymentStatus !== 'FULLY_PAID' && (
                        <Card className="p-4 bg-primary/5 border-primary/40 border-dashed">
                            <CardHeader className="p-0 pb-3"><CardTitle className="text-base text-primary flex items-center"><DollarSign className="mr-2 h-4 w-4"/>Record New Payment Installment</CardTitle></CardHeader>
                            <CardContent className="p-0 space-y-4">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                      <Label htmlFor="paymentAmount" className="text-card-foreground text-xs">Amount to Pay (Rs.)*</Label>
                                      <Input id="paymentAmount" type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Enter amount" className="bg-input border-border focus:ring-primary text-card-foreground mt-1" min="0.01" step="0.01" max={(selectedSale.creditOutstandingAmount ?? 0).toFixed(2)} />
                                  </div>
                                  <div>
                                      <Label htmlFor="paymentMethod" className="text-card-foreground text-xs">Payment Method*</Label>
                                      <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'CASH' | 'BANK_TRANSFER' | 'OTHER')}>
                                      <SelectTrigger className="bg-input border-border focus:ring-primary text-card-foreground mt-1"><SelectValue placeholder="Select method" /></SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="CASH"><div className="flex items-center gap-2"><WalletCards className="h-4 w-4"/>Cash</div></SelectItem>
                                          <SelectItem value="BANK_TRANSFER"><div className="flex items-center gap-2"><Landmark className="h-4 w-4"/>Bank Transfer</div></SelectItem>
                                          <SelectItem value="OTHER"><div className="flex items-center gap-2"><Banknote className="h-4 w-4"/>Other</div></SelectItem>
                                      </SelectContent>
                                      </Select>
                                  </div>
                                </div>
                                <div>
                                <Label htmlFor="paymentNotes" className="text-card-foreground text-xs">Notes (Optional)</Label>
                                <Textarea id="paymentNotes" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="e.g., Paid by John Doe, Ref#123" className="bg-input border-border focus:ring-primary text-card-foreground min-h-[60px] mt-1" />
                                </div>
                                <Button onClick={handleRecordPayment} disabled={isProcessingPayment || !paymentAmount || parseFloat(paymentAmount) <=0 || !canUpdateSale} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                                {isProcessingPayment ? 'Processing...' : 'Record Payment'}
                                </Button>
                            </CardContent>
                        </Card>
                      )}

                      <Accordion type="single" collapsible defaultValue="item-1">
                        <AccordionTrigger>View Payment History</AccordionTrigger>
                        <AccordionContent>
                            <div className="p-3 bg-muted/20 border-border/40 rounded-md">
                              {isLoadingInstallments ? (
                                <p className="text-muted-foreground text-xs">Loading payment history...</p>
                              ) : installments.length === 0 ? (
                                <p className="text-muted-foreground text-xs">No payment installments recorded for this bill yet.</p>
                              ) : (
                                <ScrollArea className="h-48">
                                  <Table>
                                    <TableHeader className="sticky top-0 bg-muted/50 z-10"><TableRow><TableHead className="text-muted-foreground h-8 text-xs">Date</TableHead><TableHead className="text-right text-muted-foreground h-8 text-xs">Amount Paid</TableHead><TableHead className="text-muted-foreground h-8 text-xs">Method</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                      {installments.map((inst) => (
                                        <TableRow key={inst.id} className="hover:bg-muted/30"><TableCell className="text-card-foreground text-xs py-1.5">{new Date(inst.paymentDate).toLocaleString()}</TableCell><TableCell className="text-right text-card-foreground text-xs py-1.5">Rs. {inst.amountPaid.toFixed(2)}</TableCell><TableCell className="text-card-foreground text-xs py-1.5">{inst.method}</TableCell></TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </ScrollArea>
                              )}
                            </div>
                          </AccordionContent>
                      </Accordion>

                    </>
                  )}
                </CardContent>
              </ScrollArea>
            </Card>
        </div>
        {isPrintingBill && selectedSale && (
          <div id="printable-credit-bill-holder" style={{ display: 'none' }}>
            <CreditBillPrintContent
              saleRecord={selectedSale}
              installments={installments}
              companyName={currentUser?.company?.name}
              companyAddress={currentUser?.company?.address}
              companyPhone={currentUser?.company?.phone}
            />
          </div>
        )}
      </div>
    </>
  );
}
