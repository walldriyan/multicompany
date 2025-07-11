
"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store/store';
import { useRouter } from 'next/navigation';

import {
  addProductToSale,
  updateItemQuantity,
  removeItemFromSale,
  clearSale,
  selectAllProducts,
  selectSaleItems,
  selectTaxRate,
  selectSaleSubtotalOriginal,
  selectCalculatedTax,
  selectSaleTotal,
  selectAppliedDiscountSummary,
  selectDiscountSets,
  selectActiveDiscountSetId,
  setActiveDiscountSetId,
  selectCalculatedDiscounts,
  selectActiveDiscountSet,
  initializeDiscountSets,
  initializeTaxRate,
  initializeAllProducts,
  _internalUpdateMultipleProductStock,
} from '@/store/slices/saleSlice';
import { selectCurrentUser, selectAuthStatus } from '@/store/slices/authSlice';


import { saveSaleRecordAction } from '@/app/actions/saleActions';
import { getDiscountSetsAction, getTaxRateAction } from '@/app/actions/settingsActions';
import { getAllProductsAction } from '@/app/actions/productActions';
import { store } from '@/store/store';

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ProductSearch, type ProductSearchHandle } from "@/components/pos/ProductSearch";
import { SaleSummary } from "@/components/pos/SaleSummary";
import { CurrentSaleItemsTable } from "@/components/pos/CurrentSaleItemsTable";
import { SettingsDialog } from "@/components/pos/SettingsDialog";
import { DiscountInfoDialog } from "@/components/pos/DiscountInfoDialog";
import { PaymentDialog } from "@/components/pos/PaymentDialog";
import type { Product, SaleItem, DiscountSet, AppliedRuleInfo, SpecificDiscountRuleConfig, PaymentMethod, SaleRecordType, SaleStatus, SaleRecordItemInput, SaleRecordInput, UnitDefinition, CreditPaymentStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, CreditCard, DollarSign, ShoppingBag, Settings as SettingsIcon, ArchiveRestore, LayoutDashboard } from "lucide-react";
import { CreditPaymentStatusEnumSchema } from '@/lib/zodSchemas';
import BarcodeReader from 'react-barcode-reader';


export default function PosPage() {
  const router = useRouter();
  const currentUser = useSelector(selectCurrentUser);
  const authStatus = useSelector(selectAuthStatus);
  const dispatch: AppDispatch = useDispatch();
  const { toast } = useToast();
  const productSearchRef = useRef<ProductSearchHandle>(null);

  const allProductsFromStore = useSelector(selectAllProducts);
  const saleItems = useSelector(selectSaleItems);
  const discountSets = useSelector(selectDiscountSets);
  const activeDiscountSetId = useSelector(selectActiveDiscountSetId);
  const activeDiscountSet = useSelector(selectActiveDiscountSet);
  const taxRate = useSelector(selectTaxRate);

  const subtotalOriginal = useSelector(selectSaleSubtotalOriginal);
  const tax = useSelector(selectCalculatedTax);
  const total = useSelector(selectSaleTotal);

  const calculatedDiscountsSelectorResult = useSelector(selectCalculatedDiscounts);
  const appliedDiscountSummaryFromSelector = useSelector(selectAppliedDiscountSummary);


  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isDiscountInfoDialogOpen, setIsDiscountInfoDialogOpen] = useState(false);
  const [selectedDiscountRuleForInfo, setSelectedDiscountRuleForInfo] = useState<{ rule: AppliedRuleInfo, config?: SpecificDiscountRuleConfig } | null>(null);

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<PaymentMethod | null>(null);
  const [currentBillNumber, setCurrentBillNumber] = useState('');

  const [isClient, setIsClient] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);

  useEffect(() => {
    if (authStatus !== 'loading' && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authStatus, router]);

  useEffect(() => {
    setIsClient(true);
    if (!currentUser) return; // Don't load data if not logged in

    const loadInitialData = async () => {
      setIsLoadingInitialData(true);
      try {
        const productsResult = await getAllProductsAction();
        if (productsResult.success && productsResult.data) {
          dispatch(initializeAllProducts(productsResult.data));
        } else {
          console.error("Failed to load products from server:", productsResult.error, productsResult.detailedError);
          toast({
            title: "Product Load Error",
            description: productsResult.error || "Could not load products from server. Please try refreshing.",
            variant: "destructive",
          });
        }

        const discountSetsResult = await getDiscountSetsAction();
        if (discountSetsResult.success && discountSetsResult.data) {
          dispatch(initializeDiscountSets(discountSetsResult.data));
        } else {
          console.error("Failed to load discount sets from server:", discountSetsResult.error);
          toast({
            title: "Settings Load Error",
            description: "Could not load discount sets from server.",
            variant: "destructive",
          });
        }

        const taxRateResult = await getTaxRateAction();
        if (taxRateResult.success && taxRateResult.data !== undefined) {
          dispatch(initializeTaxRate(taxRateResult.data.value));
        } else {
          console.error("Failed to load tax rate from server:", taxRateResult.error);
          toast({
            title: "Settings Load Error",
            description: "Could not load tax rate from server.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to load initial data from server:", error);
        toast({
          title: "Initial Data Load Error",
          description: "Could not load initial data from server. Some features may not work correctly.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingInitialData(false);
      }
    };
    loadInitialData();
  }, [dispatch, toast, currentUser]);

  useEffect(() => {
    if (isClient && !isLoadingInitialData && currentUser) {
      productSearchRef.current?.focusSearchInput();
    }
  }, [isClient, isLoadingInitialData, currentUser]);

  useEffect(() => {
    if (!isClient) return;

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTypingInInput = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;
      
      const isButton = target.tagName === 'BUTTON';
      const isWithinPopper = target.closest('[role="dialog"], [role="menu"], [data-radix-popper-content-wrapper]') !== null;


      if (isTypingInInput || isButton || isWithinPopper) {
        return; 
      }
      
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        productSearchRef.current?.focusSearchInput();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isClient]);


  const handleProductSelectionFromSearch = useCallback((productToAdd: Product) => {
    const productInStore = allProductsFromStore.find(p => p.id === productToAdd.id);
    if (!productInStore) {
        toast({ title: "Error", description: "Product not found in current inventory.", variant: "destructive"});
        return;
    }
    
    if (!productInStore.isActive) {
      toast({ title: "Product Inactive", description: `${productInStore.name} is not active and cannot be added.`, variant: "destructive"});
      return;
    }
    if (!productInStore.isService && productInStore.stock <=0) {
       toast({ title: "Out of Stock", description: `${productInStore.name} is out of stock.`, variant: "destructive"});
    }


    dispatch(addProductToSale({ product: productInStore }));

    const existingItem = saleItems.find((item) => item.id === productInStore.id);
     if (existingItem) {
      if (productInStore.isService || existingItem.quantity < productInStore.stock) {
      } else if (!productInStore.isService) {
        toast({ title: "Stock limit reached", description: `Cannot add more ${productInStore.name}.`, variant: "destructive" });
      }
    }
  }, [dispatch, saleItems, toast, allProductsFromStore]);

  const handleQuantityChange = useCallback((itemId: string, newQuantity: number) => {
    const itemToUpdate = saleItems.find(item => item.id === itemId);
    if (!itemToUpdate) return;

    const productInStore = allProductsFromStore.find(p => p.id === itemId);
    const stockLimit = (productInStore && !productInStore.isService) ? productInStore.stock : Infinity;


    let toastInfo: { title: string; description: string; variant?: 'default' | 'destructive' } | null = null;

    if (newQuantity <= 0) {
    } else if (newQuantity > stockLimit) {
      toastInfo = { title: "Stock Limit Reached", description: `Max stock for ${itemToUpdate.name} is ${stockLimit}. Quantity set to max.`, variant: "destructive" };
    }

    dispatch(updateItemQuantity({ itemId, newQuantity }));
    if(toastInfo) {
        setTimeout(() => toast(toastInfo!),0);
    }
  }, [dispatch, saleItems, toast, allProductsFromStore]);

  const handleRemoveItem = useCallback((itemId: string) => {
    const itemToRemove = saleItems.find(item => item.id === itemId);
    dispatch(removeItemFromSale({ itemId }));
  }, [dispatch, saleItems]);


  const handleNewSale = () => {
    dispatch(clearSale());
    toast({ title: "New Sale Started", description: "Current sale has been cleared." });
    productSearchRef.current?.focusSearchInput();
  };

  const handleOpenPaymentDialog = (method: PaymentMethod) => {
    if (saleItems.length === 0 || saleItems.every(item => item.quantity <=0)) {
      toast({ title: "Empty Sale", description: "Add items with valid quantities to the sale before payment.", variant: "destructive" });
      return;
    }
    setCurrentPaymentMethod(method);
    setCurrentBillNumber(`BN-${Date.now().toString().slice(-6)}`);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = async (paymentDetails: {
    customerName?: string;
    customerId?: string | null;
    amountPaid?: number; 
    changeDue?: number; 
  }) => {
    if (!currentUser?.id) {
        toast({
            title: "Authentication Error",
            description: "You must be logged in to complete a sale.",
            variant: "destructive",
        });
        return;
    }

     const currentStoreState = store.getState();
     const currentSaleItems = selectSaleItems(currentStoreState);
     const currentSubtotalOriginal = selectSaleSubtotalOriginal(currentStoreState);
     const currentTaxRate = selectTaxRate(currentStoreState);
     const currentCalculatedTax = selectCalculatedTax(currentStoreState);
     const currentCalculatedTotal = selectSaleTotal(currentStoreState);
     const currentAllProducts = selectAllProducts(currentStoreState);

     const {
        itemDiscounts: currentItemDiscountsMap,
        totalItemDiscountAmount: currentTotalItemDiscount,
        totalCartDiscountAmount: currentTotalCartDiscount
     } = selectCalculatedDiscounts(currentStoreState);

     const currentAppliedDiscountSummary = selectAppliedDiscountSummary(currentStoreState);
     const currentActiveDiscountSetId = selectActiveDiscountSetId(currentStoreState);
     const validSaleItems = currentSaleItems.filter(item => item.quantity > 0);

     if (validSaleItems.length === 0) {
        toast({
            title: "Empty Sale",
            description: "No valid items to process for payment.",
            variant: "destructive",
        });
        return;
     }

     const saleRecordItems: SaleRecordItemInput[] = validSaleItems.map(item => {
        const productDetails = currentAllProducts.find(p => p.id === item.id);
        const originalItemPrice = productDetails?.sellingPrice ?? item.sellingPrice ?? 0;
        const itemDiscountDetails = currentItemDiscountsMap.get(item.id);
        const totalDiscountAppliedToThisLine = itemDiscountDetails?.totalCalculatedDiscountForLine ?? 0;
        let effectivePricePaidPerUnitValue = originalItemPrice - (item.quantity > 0 ? totalDiscountAppliedToThisLine / item.quantity : 0);
        effectivePricePaidPerUnitValue = Math.max(0, effectivePricePaidPerUnitValue);

        const unitsToStore: UnitDefinition = {
            baseUnit: productDetails?.units?.baseUnit || item.units?.baseUnit || "pcs",
            derivedUnits: productDetails?.units?.derivedUnits || item.units?.derivedUnits || [],
        };
        if (!unitsToStore.baseUnit) unitsToStore.baseUnit = "pcs";

        return {
            productId: item.id, name: productDetails?.name || item.name, price: originalItemPrice,
            category: productDetails?.category, imageUrl: productDetails?.imageUrl, units: unitsToStore,
            quantity: item.quantity, priceAtSale: originalItemPrice,
            effectivePricePaidPerUnit: effectivePricePaidPerUnitValue, totalDiscountOnLine: totalDiscountAppliedToThisLine,
        };
     });
    
    const actualAmountPaidByCustomer = paymentDetails.amountPaid || 0;
    let creditOutstandingAmt: number | null = null;
    let creditPayStatus: CreditPaymentStatus | null = null;

    if (currentPaymentMethod === 'credit') {
        creditOutstandingAmt = Math.max(0, currentCalculatedTotal - actualAmountPaidByCustomer);
        if (creditOutstandingAmt <= 0.009) { 
            creditPayStatus = CreditPaymentStatusEnumSchema.Enum.FULLY_PAID;
            creditOutstandingAmt = 0; 
        } else if (actualAmountPaidByCustomer > 0) {
            creditPayStatus = CreditPaymentStatusEnumSchema.Enum.PARTIALLY_PAID;
        } else {
            creditPayStatus = CreditPaymentStatusEnumSchema.Enum.PENDING;
        }
    }


     const saleRecord: SaleRecordInput = {
        recordType: 'SALE' as SaleRecordType, billNumber: currentBillNumber,
        date: new Date().toISOString(), customerName: paymentDetails.customerName || null,
        customerId: paymentDetails.customerId || null,
        items: saleRecordItems, subtotalOriginal: currentSubtotalOriginal,
        totalItemDiscountAmount: currentTotalItemDiscount, totalCartDiscountAmount: currentTotalCartDiscount,
        netSubtotal: currentSubtotalOriginal - currentTotalItemDiscount - currentTotalCartDiscount,
        appliedDiscountSummary: currentAppliedDiscountSummary,
        activeDiscountSetId: currentActiveDiscountSetId || null,
        taxRate: currentTaxRate, taxAmount: currentCalculatedTax, totalAmount: currentCalculatedTotal,
        paymentMethod: currentPaymentMethod!,
        amountPaidByCustomer: actualAmountPaidByCustomer,
        changeDueToCustomer: paymentDetails.changeDue || 0,
        status: 'COMPLETED_ORIGINAL' as SaleStatus, returnedItemsLog: [], originalSaleRecordId: null,
        isCreditSale: currentPaymentMethod === 'credit',
        creditOutstandingAmount: creditOutstandingAmt,
        creditPaymentStatus: creditPayStatus,
        creditLastPaymentDate: actualAmountPaidByCustomer > 0 && currentPaymentMethod === 'credit' ? new Date().toISOString() : null,
     };

    if (!saleRecord.items || !Array.isArray(saleRecord.items) || saleRecord.items.length === 0) {
      console.error("Invalid saleRecord.items on client before sending (empty or invalid):", saleRecord.items);
      toast({
        title: "Client Error",
        description: "No valid sale items to save. Please check cart.",
        variant: "destructive",
        duration: 7000,
      });
      return;
    }

     try {
        const result = await saveSaleRecordAction(saleRecord, currentUser.id);
        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to save sale to server.");
        }

        const stockUpdatesForClient = result.data.items.map(savedItem => {
            const originalProduct = currentAllProducts.find(p => p.id === savedItem.productId);
            if (originalProduct && !originalProduct.isService) {
                return { productId: savedItem.productId, newStock: originalProduct.stock - savedItem.quantity };
            }
            return null;
        }).filter(Boolean) as { productId: string; newStock: number }[];

        if (stockUpdatesForClient.length > 0) {
            dispatch(_internalUpdateMultipleProductStock(stockUpdatesForClient));
        }

        let successMessage = `Paid Rs. ${actualAmountPaidByCustomer.toFixed(2)} via ${currentPaymentMethod}. Sale completed & saved. Bill: ${result.data?.billNumber || currentBillNumber}`;
        if (currentPaymentMethod === 'credit') {
            successMessage += `. Outstanding: Rs. ${(creditOutstandingAmt ?? 0).toFixed(2)}. Status: ${creditPayStatus || 'N/A'}`;
        }

        toast({
          title: "Payment Successful!",
          description: successMessage,
        });
      } catch (error) {
        console.error("Failed to save sale via server action:", error);
        toast({
          title: "Save Error",
          description: `Payment successful, but failed to save sale record. ${error instanceof Error ? error.message : 'Please check server logs.'}`,
          variant: "destructive",
          duration: 7000,
        });
      }

      dispatch(clearSale());
      setIsPaymentDialogOpen(false);
      setCurrentPaymentMethod(null);
      setCurrentBillNumber('');
      productSearchRef.current?.focusSearchInput();
  };


  const handleActiveDiscountSetChange = (setId: string) => {
    dispatch(setActiveDiscountSetId(setId === "none" ? null : setId));
  };

  const handleOpenDiscountInfoDialog = useCallback((ruleInfo: AppliedRuleInfo) => {
    let originalConfig: SpecificDiscountRuleConfig | undefined = undefined;
    if (activeDiscountSet) {
        const ruleSourceType = ruleInfo.ruleType as keyof DiscountSet;
        const ruleContainer = activeDiscountSet[ruleSourceType as 'productConfigurations' | 'globalCartPriceRuleJson' | 'globalCartQuantityRuleJson' | 'defaultLineItemValueRuleJson' | 'defaultLineItemQuantityRuleJson' | 'defaultSpecificQtyThresholdRuleJson' | 'defaultSpecificUnitPriceThresholdRuleJson'];
        
        if (ruleInfo.ruleType.startsWith('product_config_')) {
            const prodConfig = activeDiscountSet.productConfigurations?.find(pc => pc.productId === ruleInfo.productIdAffected);
            if (prodConfig) {
                if (ruleInfo.ruleType === 'product_config_line_item_value' && prodConfig.lineItemValueRuleJson?.name === ruleInfo.sourceRuleName) originalConfig = prodConfig.lineItemValueRuleJson;
                else if (ruleInfo.ruleType === 'product_config_line_item_quantity' && prodConfig.lineItemQuantityRuleJson?.name === ruleInfo.sourceRuleName) originalConfig = prodConfig.lineItemQuantityRuleJson;
                else if (ruleInfo.ruleType === 'product_config_specific_qty_threshold' && prodConfig.specificQtyThresholdRuleJson?.name === ruleInfo.sourceRuleName) originalConfig = prodConfig.specificQtyThresholdRuleJson;
                else if (ruleInfo.ruleType === 'product_config_specific_unit_price' && prodConfig.specificUnitPriceThresholdRuleJson?.name === ruleInfo.sourceRuleName) originalConfig = prodConfig.specificUnitPriceThresholdRuleJson;
            }
        } else if (ruleInfo.ruleType.startsWith('campaign_default_')) {
            if (ruleInfo.ruleType === 'campaign_default_line_item_value' && activeDiscountSet.defaultLineItemValueRuleJson?.name === ruleInfo.sourceRuleName) originalConfig = activeDiscountSet.defaultLineItemValueRuleJson;
            else if (ruleInfo.ruleType === 'campaign_default_line_item_quantity' && activeDiscountSet.defaultLineItemQuantityRuleJson?.name === ruleInfo.sourceRuleName) originalConfig = activeDiscountSet.defaultLineItemQuantityRuleJson;
            else if (ruleInfo.ruleType === 'campaign_default_specific_qty_threshold' && activeDiscountSet.defaultSpecificQtyThresholdRuleJson?.name === ruleInfo.sourceRuleName) originalConfig = activeDiscountSet.defaultSpecificQtyThresholdRuleJson;
            else if (ruleInfo.ruleType === 'campaign_default_specific_unit_price' && activeDiscountSet.defaultSpecificUnitPriceThresholdRuleJson?.name === ruleInfo.sourceRuleName) originalConfig = activeDiscountSet.defaultSpecificUnitPriceThresholdRuleJson;
        }
         else if (ruleInfo.ruleType.startsWith('campaign_global_') && ruleContainer && typeof ruleContainer === 'object' && 'name' in ruleContainer && (ruleContainer as SpecificDiscountRuleConfig).name === ruleInfo.sourceRuleName) {
            originalConfig = ruleContainer as SpecificDiscountRuleConfig;
        }
    }
    setSelectedDiscountRuleForInfo({ rule: ruleInfo, config: originalConfig });
    setIsDiscountInfoDialogOpen(true);
  }, [activeDiscountSet]);

  const handleBarcodeScan = useCallback((data: string) => {
    if (!data) return;
    const trimmedData = data.trim();
    if (!trimmedData) return;

    const productFound = allProductsFromStore.find(p => p.barcode === trimmedData);

    if (productFound) {
      if (productFound.isActive) {
        handleProductSelectionFromSearch(productFound);
      } else {
        toast({
            title: "Product Inactive",
            description: `${productFound.name} is inactive and cannot be added.`,
            variant: "destructive",
        });
      }
    } else {
        toast({
            title: "Barcode Not Found",
            description: `No product found with barcode: ${trimmedData}`,
            variant: "destructive",
        });
    }
    productSearchRef.current?.focusSearchInput();
  }, [allProductsFromStore, handleProductSelectionFromSearch, toast]);

  const handleBarcodeError = useCallback((err: any) => {
    if (typeof err === 'string' && err.trim().length <= 3) { 
      return; 
    }
    console.error("Barcode reader error:", err);
  }, []);

  if (authStatus === 'loading' || !currentUser) {
    return (
        <div className="flex h-screen bg-background text-foreground font-body items-center justify-center">
            <div className="flex flex-col items-center space-y-3">
                <ShoppingBag className="h-16 w-16 text-primary animate-pulse" />
                <p className="text-xl text-muted-foreground">Authenticating...</p>
            </div>
        </div>
    );
  }

  if (isLoadingInitialData && isClient) {
    return (
        <div className="flex h-screen bg-background text-foreground font-body items-center justify-center">
            <div className="flex flex-col items-center space-y-3">
                <ShoppingBag className="h-16 w-16 text-primary animate-pulse" />
                <p className="text-xl text-muted-foreground">Loading POS System...</p>
            </div>
        </div>
    );
  }


  return (
    <div className="flex h-screen bg-background text-foreground font-body">
      {isClient && (
        <BarcodeReader
            onError={handleBarcodeError}
            onScan={handleBarcodeScan}
        />
      )}
      <div className="w-3/5 flex flex-col border-r border-border overflow-hidden">
        <header className="p-4 bg-card shadow-sm space-y-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
                <ShoppingBag className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-headline font-semibold">Aronium POS</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Link href="/dashboard" passHref>
                <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setIsSettingsDialogOpen(true)} className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  <SettingsIcon className="mr-2 h-4 w-4" /> Settings
              </Button>
            </div>
          </div>
          <ProductSearch
            ref={productSearchRef}
            allProducts={allProductsFromStore}
            onProductSelect={handleProductSelectionFromSearch}
          />
        </header>
        <div className="flex-1 p-4 overflow-y-auto">
           <CurrentSaleItemsTable
             items={saleItems}
             onQuantityChange={handleQuantityChange}
             onRemoveItem={handleRemoveItem}
           />
        </div>
      </div>

      <div className="w-2/5 flex flex-col bg-card">
        {isClient ? (
          <>
            <div className="p-4 space-y-3">
                <h2 className="text-xl font-semibold text-card-foreground">Sale Summary &amp; Actions</h2>
                <div className="space-y-2">
                    <Label htmlFor="active-discount-set" className="text-sm font-medium">Active Discount Set</Label>
                    <Select value={activeDiscountSetId || "none"} onValueChange={handleActiveDiscountSetChange}>
                        <SelectTrigger id="active-discount-set" className="w-full bg-input border-border focus:ring-primary text-card-foreground">
                            <SelectValue placeholder="Select a discount set..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No Discount Set Applied</SelectItem>
                            {discountSets.map(ds => (
                                <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <Separator className="bg-border my-0" />

            <div className="flex-1 p-4 overflow-y-auto">
              {saleItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Your cart is empty.</p>
                  <p className="text-sm text-muted-foreground">Search for products to add them to the sale.</p>
                </div>
              ) : (
                 <SaleSummary
                    subtotalOriginal={subtotalOriginal}
                    totalItemDiscountAmount={calculatedDiscountsSelectorResult.totalItemDiscountAmount}
                    totalCartDiscountAmount={calculatedDiscountsSelectorResult.totalCartDiscountAmount}
                    tax={tax}
                    total={total}
                    taxRate={taxRate}
                    appliedDiscountSummary={appliedDiscountSummaryFromSelector}
                    onOpenDiscountInfoDialog={handleOpenDiscountInfoDialog}
                 />
              )}
            </div>

            <div className="p-4 border-t border-border space-y-3 sticky bottom-0 bg-card">
              {saleItems.length > 0 && <Separator className="bg-border mb-3" />}
              <div className="grid grid-cols-1 gap-2">
                <Button onClick={handleNewSale} variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" disabled={saleItems.length === 0}>
                  <PlusCircle className="mr-2 h-4 w-4" /> New Sale
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button onClick={() => handleOpenPaymentDialog('cash')} className="bg-green-500 hover:bg-green-600 text-white" disabled={saleItems.length === 0 || saleItems.every(item => item.quantity <=0)}>
                  <DollarSign className="mr-2 h-4 w-4" /> Cash
                </Button>
                <Button onClick={() => handleOpenPaymentDialog('credit')} className="bg-blue-500 hover:bg-blue-500 text-white" disabled={saleItems.length === 0 || saleItems.every(item => item.quantity <=0)}>
                  <CreditCard className="mr-2 h-4 w-4" /> Credit / Card
                </Button>
              </div>
              <div className="mt-2">
                <Link href="/returns" passHref>
                  <Button variant="outline" className="w-full border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white">
                    <ArchiveRestore className="mr-2 h-4 w-4" /> Return Item
                  </Button>
                </Link>
              </div>
            </div>
          </>
        ) : (
            <>
            <div className="p-4 space-y-3">
              <h2 className="text-xl font-semibold text-card-foreground">Sale Summary &amp; Actions</h2>
              <div className="space-y-2">
                <Label htmlFor="active-discount-set" className="text-sm font-medium">Active Discount Set</Label>
                <div className="w-full h-10 rounded-md border border-input bg-input animate-pulse" aria-label="Loading discount sets..."></div>
              </div>
            </div>
            <Separator className="bg-border my-0" />
            <div className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center text-center">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Loading POS...</p>
            </div>
            <div className="p-4 border-t border-border space-y-3 sticky bottom-0 bg-card">
              <div className="grid grid-cols-1 gap-2">
                <div className="w-full h-10 rounded-md border border-primary bg-primary/20 animate-pulse"></div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="w-full h-10 rounded-md bg-green-500/50 animate-pulse"></div>
                <div className="w-full h-10 rounded-md bg-blue-500/50 animate-pulse"></div>
              </div>
               <div className="mt-2">
                <div className="w-full h-10 rounded-md border border-amber-500 bg-amber-500/20 animate-pulse"></div>
              </div>
            </div>
          </>
        )}
      </div>

      <SettingsDialog
        isOpen={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
      />
      {selectedDiscountRuleForInfo && (
        <DiscountInfoDialog
            isOpen={isDiscountInfoDialogOpen}
            onOpenChange={setIsDiscountInfoDialogOpen}
            ruleInfo={selectedDiscountRuleForInfo.rule}
            ruleConfig={selectedDiscountRuleForInfo.config}
        />
      )}
      {currentPaymentMethod && (
        <PaymentDialog
            isOpen={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            paymentMethod={currentPaymentMethod}
            billNumber={currentBillNumber}
            onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
