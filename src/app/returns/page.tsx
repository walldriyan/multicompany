
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, Undo, PackageOpen, ListChecks, Check, ArrowLeft, Printer, History, FileText, Copy, CheckSquare, FileDiff, Info, Sigma, Undo2, ChevronLeft, ChevronRight, FileArchive, X, ShoppingBag, AlertTriangle } from "lucide-react";
import type { SaleRecord, SaleRecordItem, SaleStatus, AppliedRuleInfo, ReturnedItemDetail, SaleRecordType, PaymentMethod, SpecificDiscountRuleConfig, DiscountSet, UnitDefinition, Product, SaleItem, ReturnedItemDetailInput } from '@/types';
import { getSaleContextByBillNumberAction, getAllSaleRecordsAction, undoReturnItemAction, saveSaleRecordAction } from '@/app/actions/saleActions';
import { processFullReturnWithRecalculationAction } from '@/app/actions/returnActions';
import { getDiscountSetsAction, getTaxRateAction } from '@/app/actions/settingsActions';
import { updateProductStockAction, getAllProductsAction as fetchAllProductsForServerLogic } from '@/app/actions/productActions';
import { useToast } from "@/hooks/use-toast";
import { useDispatch, useSelector } from 'react-redux';
import { store } from '@/store/store';
import { _internalUpdateMultipleProductStock, selectTaxRate, selectDiscountSets as selectAllGlobalDiscountSets, initializeDiscountSets, selectDiscountSetsLoaded, selectAllProducts as selectAllProductsFromStore, initializeAllProducts, initializeTaxRate } from '@/store/slices/saleSlice';
import { selectCurrentUser } from '@/store/slices/authSlice';
import type { AppDispatch } from '@/store/store';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from "@/components/ui/skeleton";
import { ReturnReceiptPrintContent } from '@/components/pos/ReturnReceiptPrintContent';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getDisplayQuantityAndUnit } from '@/lib/unitUtils';
import { calculateDiscountsForItems } from '@/lib/discountUtils';
import { usePermissions } from '@/hooks/usePermissions';


interface ItemToReturnEntry extends SaleRecordItem {
  returnQuantity: number;
}

interface FoundSaleContextState {
  pristineOriginalSale: SaleRecord | null;
  latestAdjustedOrOriginal: SaleRecord | null;
}

interface LastProcessedReturnDetails {
  returnTransactionRecord: SaleRecord;
  currentAdjustedSaleAfterReturn: SaleRecord;
}

const ITEMS_PER_PAGE = 20;

export default function ReturnsPage() {
  const dispatch: AppDispatch = useDispatch();
  const { toast } = useToast();
  const currentUser = useSelector(selectCurrentUser);
  const { can } = usePermissions(); // Use the hook
  const globalTaxRateFromStore = useSelector(selectTaxRate);
  const allGlobalDiscountSets = useSelector(selectAllGlobalDiscountSets);
  const discountSetsLoaded = useSelector(selectDiscountSetsLoaded);
  const allProductsFromStore = useSelector(selectAllProductsFromStore);
  
  const isSuperAdminWithoutCompany = currentUser?.role?.name === 'Admin' && !currentUser?.companyId;

  const [billNumberSearch, setBillNumberSearch] = useState('');
  const [foundSaleState, setFoundSaleState] = useState<FoundSaleContextState>({ pristineOriginalSale: null, latestAdjustedOrOriginal: null });
  const [itemsToReturnUiList, setItemsToReturnUiList] = useState<ItemToReturnEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const [allSalesForHistoryList, setAllSalesForHistoryList] = useState<SaleRecord[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<SaleRecord[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const [lastProcessedReturn, setLastProcessedReturn] = useState<LastProcessedReturnDetails | null>(null);
  const [isReturnReceiptVisible, setIsReturnReceiptVisible] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalSalesCount, setTotalSalesCount] = useState(0);
  
  const [undoConfirmationOpen, setUndoConfirmationOpen] = useState(false);
  const [itemToUndo, setItemToUndo] = useState<{
    masterSaleRecordId: string; 
    returnedItemDetailId: string; 
    itemName: string;
    originalBillNumberForContext: string;
  } | null>(null);


  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsPopoverContentRef = useRef<HTMLDivElement>(null);
  
  const hasUpdateSalePermission = can('update', 'Sale');


  useEffect(() => {
    const loadInitialData = async () => {
        if (!currentUser?.id || isSuperAdminWithoutCompany) return;
        try {
            const productsResult = await fetchAllProductsForServerLogic(currentUser.id);
            if (productsResult.success && productsResult.data) {
                setAllProducts(productsResult.data);
                dispatch(initializeAllProducts(productsResult.data));
            }

            if (!discountSetsLoaded) {
                const discountSetsResult = await getDiscountSetsAction(currentUser.id);
                if (discountSetsResult.success && discountSetsResult.data) {
                    dispatch(initializeDiscountSets(discountSetsResult.data));
                }
            }
            if (globalTaxRateFromStore === 0.00 && store.getState().sale.taxRate === 0.00) { 
                const taxRateResult = await getTaxRateAction();
                if (taxRateResult.success && taxRateResult.data !== undefined) {
                    dispatch(initializeTaxRate(taxRateResult.data.value));
                }
            }
        } catch (error) { console.error("Error loading initial data for returns page:", error); }
    };
    loadInitialData();
  }, [dispatch, discountSetsLoaded, globalTaxRateFromStore, currentUser, isSuperAdminWithoutCompany]);


  const resetPageState = useCallback((keepSearchTerm = false) => {
    if (!keepSearchTerm) setBillNumberSearch('');
    setFoundSaleState({ pristineOriginalSale: null, latestAdjustedOrOriginal: null });
    setItemsToReturnUiList([]);
    setIsLoading(false);
    if (!keepSearchTerm) setSearchSuggestions([]);
    setIsSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    setLastProcessedReturn(null);
    setAccordionValue([]);
  }, []);

  const fetchSalesHistoryPage = useCallback(async (page: number) => {
    if (!currentUser?.id || isSuperAdminWithoutCompany) {
      setIsFetchingHistory(false);
      return;
    }
    setIsFetchingHistory(true);
    try {
      const result = await getAllSaleRecordsAction(currentUser.id, page, ITEMS_PER_PAGE); 
      if (result.success && result.data) {
        setAllSalesForHistoryList(result.data.sales);
        setTotalSalesCount(result.data.totalCount);
      } else {
        setAllSalesForHistoryList([]);
        setTotalSalesCount(0);
        if (result.error) toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (err) {
      console.error("Failed to load sales history from server:", err);
      toast({ title: "Error", description: "Could not load sales history.", variant: "destructive" });
    } finally {
      setIsFetchingHistory(false);
    }
  }, [toast, currentUser, isSuperAdminWithoutCompany]);

  useEffect(() => {
    if (currentUser) {
      fetchSalesHistoryPage(currentPage);
    }
  }, [fetchSalesHistoryPage, currentPage, currentUser]);

  const refreshSaleContextAfterUpdate = useCallback(async (billNumber: string, clickedAdjustedSaleId?: string | null): Promise<FoundSaleContextState | null> => {
    if (!currentUser?.id) return null;
    setIsLoading(true);
    try {
        const contextResult = await getSaleContextByBillNumberAction(billNumber, currentUser.id, clickedAdjustedSaleId);
        if (contextResult.success && contextResult.data) {
            const newState = {
                pristineOriginalSale: contextResult.data.pristineOriginalSale,
                latestAdjustedOrOriginal: contextResult.data.latestAdjustedOrOriginal,
            };
            setFoundSaleState(newState);
            const saleForUi = contextResult.data.latestAdjustedOrOriginal || contextResult.data.pristineOriginalSale;
            if (saleForUi) {
                setItemsToReturnUiList(
                    saleForUi.items.filter(item => item.quantity > 0).map(item => ({ ...item, returnQuantity: 0 }))
                );
            } else {
                setItemsToReturnUiList([]);
            }
            return newState;
        } else {
            toast({ title: "Error Refreshing Context", description: contextResult.error || "Could not reload sale details.", variant: "destructive" });
            setFoundSaleState({ pristineOriginalSale: null, latestAdjustedOrOriginal: null });
            setItemsToReturnUiList([]);
            return null;
        }
    } catch (error) {
        toast({ title: "Error Refreshing Context", description: "An unexpected error occurred during refresh.", variant: "destructive" });
        setFoundSaleState({ pristineOriginalSale: null, latestAdjustedOrOriginal: null });
        setItemsToReturnUiList([]);
        return null;
    } finally {
        setIsLoading(false);
    }
  }, [toast, currentUser]);

  const handleSearchSaleContext = useCallback(async (billNumToSearch: string, clickedAdjustedSaleId?: string | null) => {
    if (!currentUser?.id) {
        toast({ title: "Authentication Error", description: "You must be logged in to search for a bill.", variant: "destructive" });
        return;
    }
    const searchTermTrimmed = billNumToSearch?.trim();
    if (!searchTermTrimmed) {
        toast({ title: "Search Error", description: "Please enter or select a bill number.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    setFoundSaleState({ pristineOriginalSale: null, latestAdjustedOrOriginal: null });
    setItemsToReturnUiList([]);
    setLastProcessedReturn(null);
    setIsSuggestionsOpen(false);
    setAccordionValue([]);

    try {
        const result = await getSaleContextByBillNumberAction(searchTermTrimmed, currentUser.id, clickedAdjustedSaleId);
        if (result.success && result.data ) {
            const { pristineOriginalSale, latestAdjustedOrOriginal } = result.data;
            
            setFoundSaleState({ pristineOriginalSale, latestAdjustedOrOriginal });
            
            const saleForReturnUi = latestAdjustedOrOriginal || pristineOriginalSale; 
            if (saleForReturnUi) {
                setItemsToReturnUiList(saleForReturnUi.items.filter(item => item.quantity > 0).map(item => ({ ...item, returnQuantity: 0 })));
            } else {
                 setItemsToReturnUiList([]);
            }

            toast({ title: "Sale Context Loaded", description: `Details for bill ${searchTermTrimmed} ready.` });
            
            const newAccordionValue = [];
            if (pristineOriginalSale) newAccordionValue.push('original-sale-details');
            if (latestAdjustedOrOriginal && latestAdjustedOrOriginal.id !== pristineOriginalSale?.id) {
                newAccordionValue.push('adjusted-sale-details');
            } else if (latestAdjustedOrOriginal && latestAdjustedOrOriginal.status === 'ADJUSTED_ACTIVE') {
                 newAccordionValue.push('adjusted-sale-details'); 
            }
            
            const relevantReturnLogs = latestAdjustedOrOriginal?.returnedItemsLog || pristineOriginalSale?.returnedItemsLog;
            if (relevantReturnLogs && Array.isArray(relevantReturnLogs) && (relevantReturnLogs as any[]).filter(log => !log.isUndone).length > 0) {
                newAccordionValue.push('return-history');
            }
            if (saleForReturnUi && saleForReturnUi.items.filter(item => item.quantity > 0).length > 0) {
                newAccordionValue.push('items-for-return');
            }
            setAccordionValue(newAccordionValue);

        } else {
            toast({ title: "Sale Context Not Found", description: result.error || `No sale context found for bill ${searchTermTrimmed}. Ensure the bill number is correct.`, variant: "destructive" });
            resetPageState(true); 
        }
    } catch (error) {
        console.error("Error fetching sale context from server:", error);
        toast({ title: "Error", description: "Could not fetch sale context.", variant: "destructive" });
        resetPageState(true);
    } finally {
        setIsLoading(false);
    }
  }, [toast, resetPageState, currentUser]);


  useEffect(() => {
    if (billNumberSearch.trim() === '') {
      setSearchSuggestions([]);
      setIsSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      return;
    }
    const lowerSearchTerm = billNumberSearch.toLowerCase();
    
    const filtered = allSalesForHistoryList.filter(
      sale =>
        sale.billNumber.toLowerCase().includes(lowerSearchTerm) ||
        (sale.customerName && sale.customerName.toLowerCase().includes(lowerSearchTerm)) ||
        new Date(sale.date).toLocaleDateString().includes(lowerSearchTerm)
    );
    setSearchSuggestions(filtered);
    setIsSuggestionsOpen(filtered.length > 0 && document.activeElement === searchInputRef.current);
    setActiveSuggestionIndex(-1);
  }, [billNumberSearch, allSalesForHistoryList]);


  const handleBillSelect = async (clickedSale: SaleRecord) => {
    setIsSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    let billNumberToUseForSearch = clickedSale.billNumber;
    setBillNumberSearch(billNumberToUseForSearch); 
    await handleSearchSaleContext(billNumberToUseForSearch, clickedSale.id);
  };
  

  const handleKeyDownOnSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      return;
    }
    if (isSuggestionsOpen && searchSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const newIndex = (activeSuggestionIndex + 1) % searchSuggestions.length;
        setActiveSuggestionIndex(newIndex);
        scrollToSuggestion(newIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newIndex = (activeSuggestionIndex - 1 + searchSuggestions.length) % searchSuggestions.length;
        setActiveSuggestionIndex(newIndex);
        scrollToSuggestion(newIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < searchSuggestions.length) {
          handleBillSelect(searchSuggestions[activeIndex]);
        } else if (searchSuggestions.length > 0) { 
          handleBillSelect(searchSuggestions[0]);
        } else { 
           handleSearchSaleContext(billNumberSearch.trim());
        }
      }
    } else if (e.key === 'Enter' && billNumberSearch.trim() !== '') { 
        e.preventDefault();
        handleSearchSaleContext(billNumberSearch.trim());
    }
  };

  const scrollToSuggestion = (index: number) => {
    if (suggestionsPopoverContentRef.current) {
      const suggestionElement = suggestionsPopoverContentRef.current.children[0]?.children[index] as HTMLElement;
      if (suggestionElement) {
        suggestionElement.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  const handleReturnQuantityChange = (itemId: string, newReturnQtyStr: string) => {
    const saleForReturnLogic = foundSaleState.latestAdjustedOrOriginal;
    if (!saleForReturnLogic) return;
    const originalItem = saleForReturnLogic.items.find(i => i.productId === itemId);
    if (!originalItem) return;
    let newReturnQty = parseInt(newReturnQtyStr, 10);
    if (isNaN(newReturnQty) || newReturnQty < 0) newReturnQty = 0;
    const availableToReturnForThisItem = getAvailableToReturnQuantity(itemId, saleForReturnLogic);
    if (newReturnQty > availableToReturnForThisItem) {
      newReturnQty = availableToReturnForThisItem;
      toast({
          title: "Limit Exceeded",
          description: `Cannot return more than ${availableToReturnForThisItem} units of ${originalItem.name}.`,
          variant: "destructive",
          duration: 2000
      });
    }
    setItemsToReturnUiList(prevItems =>
      prevItems.map(item =>
        item.productId === itemId ? { ...item, returnQuantity: newReturnQty } : item
      )
    );
  };

  const getAvailableToReturnQuantity = (itemId: string, currentSaleState: SaleRecord | null): number => {
    if (!currentSaleState) return 0;
    const itemInCurrentSale = currentSaleState.items.find(i => i.productId === itemId);
    if (!itemInCurrentSale) return 0;
    return itemInCurrentSale.quantity;
  };


  const handleProcessReturn = async () => {
    if (!currentUser?.id) {
        toast({ title: "Authentication Error", description: "You must be logged in to process a return.", variant: "destructive" });
        return;
    }
    const pristineOriginal = foundSaleState.pristineOriginalSale;
    const currentActiveSaleState = foundSaleState.latestAdjustedOrOriginal || pristineOriginal;
    
    if (!pristineOriginal || !currentActiveSaleState) {
        toast({ title: "Error", description: "Original sale context is missing.", variant: "destructive" });
        return;
    }

    const itemsToActuallyReturn = itemsToReturnUiList
        .filter(item => item.returnQuantity > 0)
        .map(item => ({
            productId: item.productId,
            returnQuantity: item.returnQuantity,
            effectivePricePaidPerUnit: item.effectivePricePaidPerUnit,
            name: item.name,
            units: item.units,
            priceAtSale: item.priceAtSale,
            originalBatchId: item.batchId,
        }));

    if (itemsToActuallyReturn.length === 0) {
        toast({ title: "No Items Selected", description: "Please specify quantities for items to return.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    setLastProcessedReturn(null);

    try {
        const result = await processFullReturnWithRecalculationAction({
            pristineOriginalSaleId: pristineOriginal.id,
            currentActiveSaleStateId: currentActiveSaleState.id,
            itemsToReturn: itemsToActuallyReturn,
        }, currentUser.id);
        
        setIsLoading(false);

        if (result && result.success && result.data) {
            const { returnTransactionId, adjustedSaleId } = result.data;
            const refreshedContext = await refreshSaleContextAfterUpdate(pristineOriginal.billNumber, adjustedSaleId);
            
            const totalRefunded = itemsToActuallyReturn.reduce((sum, item) => sum + (item.effectivePricePaidPerUnit * item.returnQuantity), 0);
            toast({ title: "Return Processed Successfully", description: `Refund of Rs. ${totalRefunded.toFixed(2)} processed. Bill updated.`, duration: 7000 });
            
            if (refreshedContext?.latestAdjustedOrOriginal && refreshedContext?.pristineOriginalSale) {
                const returnTxn = refreshedContext.latestAdjustedOrOriginal.returnedItemsLog?.find(log => log.returnTransactionId === returnTransactionId);
                 setLastProcessedReturn({
                    returnTransactionRecord: { ...refreshedContext.latestAdjustedOrOriginal, items: itemsToActuallyReturn, totalAmount: totalRefunded } as SaleRecord, // Simplified for receipt
                    currentAdjustedSaleAfterReturn: refreshedContext.latestAdjustedOrOriginal,
                });
            }
            
            fetchSalesHistoryPage(1); 
            setAccordionValue(['original-sale-details', 'adjusted-sale-details', 'return-history']);
        } else {
            const errorMessage = result?.error || "Could not process the return.";
            toast({ title: "Return Error", description: errorMessage, variant: "destructive" });
            if (pristineOriginal.billNumber) {
                await refreshSaleContextAfterUpdate(pristineOriginal.billNumber);
            }
        }
    } catch (error) {
        setIsLoading(false);
        const errorMessage = error instanceof Error ? error.message : "An unexpected client-side error occurred.";
        toast({ title: "Critical Error", description: errorMessage, variant: "destructive" });
    }
  };


  const handleAttemptUndoReturnItem = (logEntry: ReturnedItemDetail) => {
    const masterSaleForUndoContext = foundSaleState.latestAdjustedOrOriginal || foundSaleState.pristineOriginalSale;
    if (!masterSaleForUndoContext?.id || !logEntry.id || !foundSaleState.pristineOriginalSale?.billNumber) {
        toast({title: "Error", description: "Cannot undo: Missing master sale ID, return log entry ID, or original bill number context.", variant: "destructive"});
        return;
    }
    setItemToUndo({
        masterSaleRecordId: masterSaleForUndoContext.id, 
        returnedItemDetailId: logEntry.id, 
        itemName: logEntry.name,
        originalBillNumberForContext: foundSaleState.pristineOriginalSale.billNumber,
    });
    setUndoConfirmationOpen(true);
  };

  const confirmUndoReturnItem = async () => {
    if (!itemToUndo || !itemToUndo.originalBillNumberForContext || !currentUser?.id) return;
    setIsLoading(true);
    const { masterSaleRecordId, returnedItemDetailId, originalBillNumberForContext } = itemToUndo;
    
    const result = await undoReturnItemAction({ masterSaleRecordId, returnedItemDetailId }, currentUser.id);

    if (result.success && result.data) {
        toast({ title: "Return Undone", description: `Return of ${itemToUndo.itemName} successfully undone.` });
        
        await refreshSaleContextAfterUpdate(originalBillNumberForContext, result.data.id); 
        
        const logEntryThatWasUndone = result.data?.returnedItemsLog?.find(log => log.id === returnedItemDetailId && log.isUndone);
        if (logEntryThatWasUndone) {
             const productDataForStockUpdate = allProducts.find(p => p.id === logEntryThatWasUndone.itemId);
             if (productDataForStockUpdate && !productDataForStockUpdate.isService) {
                 dispatch(_internalUpdateMultipleProductStock([{ productId: productDataForStockUpdate.id, newStock: productDataForStockUpdate.stock - logEntryThatWasUndone.returnedQuantity }]));
             }
        }
        fetchSalesHistoryPage(1);
    } else {
        toast({ title: "Undo Error", description: result.error || "Failed to undo return.", variant: "destructive" });
    }
    setIsLoading(false);
    setUndoConfirmationOpen(false);
    setItemToUndo(null);
  };


  const handlePrintCombinedReceipt = () => {
    if (!lastProcessedReturn?.returnTransactionRecord || !foundSaleState.pristineOriginalSale || !lastProcessedReturn.currentAdjustedSaleAfterReturn) {
        toast({ title: "Error", description: "Not enough data to print combined receipt. Ensure a return has been processed.", variant: "destructive" });
        return;
    }
    setIsReturnReceiptVisible(true);
    setTimeout(() => {
      const printContentHolder = document.getElementById('printable-return-receipt-content-holder');
      if (!printContentHolder) {
        console.error('Return receipt content holder not found in DOM.');
        toast({ title: "Print Error", description: "Receipt content area not found.", variant: "destructive" });
        setIsReturnReceiptVisible(false);
        return;
      }
      const printContents = printContentHolder.innerHTML;
      if (!printContents || printContents.trim() === "") {
          console.error('Return receipt content holder is empty.');
          toast({ title: "Print Error", description: "No content generated for the receipt.", variant: "destructive" });
          setIsReturnReceiptVisible(false); return;
      }
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute'; iframe.style.width = '0px'; iframe.style.height = '0px'; iframe.style.border = '0';
      iframe.setAttribute('title', 'Print Combined Receipt'); document.body.appendChild(iframe);
      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        const printHtml = `
          <html><head><title>Combined Transaction Receipt - ${foundSaleState.pristineOriginalSale?.billNumber ?? 'N/A'}</title>
              <style>
                  body { margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 8pt; background-color: white; color: black; }
                  .receipt-container { width: 280px; margin: 0 auto; padding: 5px; } table { width: 100%; border-collapse: collapse; font-size: 7pt; margin-bottom: 3px; }
                  th, td { padding: 1px 2px; vertical-align: top; } .text-left { text-align: left; } .text-right { text-align: right; } .text-center { text-align: center; }
                  .font-bold { font-weight: bold; } .header-info p, .section-title { margin: 2px 0; font-size: 8pt; }
                  .item-name { word-break: break-all; max-width: 100px; } hr.separator { border: none; border-top: 1px dashed black; margin: 2px 0; color: black; background-color: black; }
                  .totals-section div { display: flex; justify-content: space-between; padding: 0px 0; font-size: 8pt; } .message { margin-top: 3px; text-align: center; font-size: 8pt; }
                  .section-break { margin-top: 5px; margin-bottom: 5px; } .sub-table th { font-size: 6.5pt; padding: 1px; } .sub-table td { font-size: 6.5pt; padding: 1px; }
                  @media print {
                      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 8pt !important; color: black !important; background-color: white !important; }
                      .receipt-container { margin: 0; padding:0; width: 100%; } table { font-size: 7pt !important; } .sub-table th, .sub-table td { font-size: 6.5pt !important; }
                  }
              </style></head><body><div class="receipt-container">${printContents}</div></body></html>`;
        iframeDoc.open(); iframeDoc.write(printHtml); iframeDoc.close();
        if (iframe.contentWindow) { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
        else { console.error("Iframe contentWindow became null before print."); toast({ title: "Print Error", description: "Failed to access iframe for printing.", variant: "destructive" }); }
      } else { console.error("Could not get iframe document for printing."); toast({ title: "Print Error", description: "Could not prepare print document (iframe issue).", variant: "destructive" }); }
      setTimeout(() => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 750);
      setIsReturnReceiptVisible(false);
    }, 150);
  };

  const pristineOriginalSaleForDisplay = foundSaleState.pristineOriginalSale; 
  const latestAdjustedSaleForDisplay = foundSaleState.latestAdjustedOrOriginal; 
  const saleForReturnLogDisplay = latestAdjustedSaleForDisplay; 


  const renderFinancialSummary = (saleRecord: SaleRecord | null, title: string, isAdjustedSummary: boolean = false) => {
    if (!saleRecord) return null;
    const subtotalOriginalFromRecord = saleRecord.subtotalOriginal || 0;
    const totalItemDiscountFromRecord = saleRecord.totalItemDiscountAmount || 0;
    const totalCartDiscountFromRecord = saleRecord.totalCartDiscountAmount || 0;
    const netSubtotalFromRecord = saleRecord.netSubtotal || 0;
    
    // Correctly use the taxAmount from the record, as it's pre-calculated on the server
    const taxAmountForDisplay = saleRecord.taxAmount || 0;
    const finalTotalForDisplay = saleRecord.totalAmount || 0;

    return (
      <div className="pl-2 text-xs">
        <div>Subtotal ({title}, Orig. Prices): Rs. {subtotalOriginalFromRecord.toFixed(2)}</div>
        {totalItemDiscountFromRecord > 0 && (<div className={isAdjustedSummary ? "text-green-500" : "text-sky-400"}>Total Item Disc. ({isAdjustedSummary ? "Re-evaluated" : "Original"}): -Rs. {totalItemDiscountFromRecord.toFixed(2)}</div>)}
        {totalCartDiscountFromRecord > 0 && (<div className={isAdjustedSummary ? "text-green-500" : "text-sky-400"}>Total Cart Disc. ({isAdjustedSummary ? "Re-evaluated" : "Original"}): -Rs. {totalCartDiscountFromRecord.toFixed(2)}</div>)}
        <div>Net Subtotal (After relevant discounts): Rs. {netSubtotalFromRecord.toFixed(2)}</div>
        <div>Tax ({ (saleRecord.taxRate * 100).toFixed(saleRecord.taxRate === 0 ? 0 : (saleRecord.taxRate % 1 === 0 ? 0 : 2)) }%): Rs. {taxAmountForDisplay.toFixed(2)}</div>
        <div className="font-bold">Total ({isAdjustedSummary ? "Net Bill" : "Paid"}): Rs. {finalTotalForDisplay.toFixed(2)}</div>
      </div>
    );
  };

  const totalLoggedRefundAmount = useMemo(() => {
    const logSource = saleForReturnLogDisplay; 
    if (!logSource?.returnedItemsLog || !Array.isArray(logSource.returnedItemsLog)) return 0;
    return (logSource.returnedItemsLog as ReturnedItemDetail[]).filter(log => !log.isUndone).reduce((sum, entry) => sum + entry.totalRefundForThisReturnEntry, 0);
  }, [saleForReturnLogDisplay]);

  const totalExpectedRefundForNewTransaction = useMemo(() => {
    if (itemsToReturnUiList.length === 0) return 0;
    return itemsToReturnUiList.reduce((sum, item) => {
      if (item.returnQuantity > 0) { return sum + (item.effectivePricePaidPerUnit * item.returnQuantity); }
      return sum;
    }, 0);
  }, [itemsToReturnUiList]);

  const maxPage = Math.max(1, Math.ceil(totalSalesCount / ITEMS_PER_PAGE));

  const getStatusBadgeForListItem = (sale: SaleRecord) => {
    const badges = [];
    if (sale.recordType === 'SALE') {
        if (sale._hasReturns) { 
            badges.push(<Badge key="refunded-badge" variant="outline" className="ml-1 text-xs px-1.5 py-0.5 bg-orange-500/30 text-orange-300 border-orange-500/60">Refunded</Badge>);
        }
    }
    return <div className="flex items-center space-x-1">{badges}</div>;
  };


  return (
    <div className="flex flex-col h-screen bg-background text-foreground p-4 md:p-6 space-y-4">
      <header className="flex items-center justify-between pb-4 border-b border-border">
        <h1 className="text-2xl font-semibold text-foreground">Process Item Return</h1>
        <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
          <Link href="/"> <ArrowLeft className="mr-2 h-4 w-4" /> Back to POS </Link>
        </Button>
      </header>

      {isSuperAdminWithoutCompany && (
        <Card className="m-4 border-yellow-500/50 bg-yellow-950/30">
          <CardContent className="p-6 flex items-center gap-4">
            <AlertTriangle className="h-10 w-10 text-yellow-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-lg text-yellow-300">Feature Disabled for this User</h3>
              <p className="text-sm text-yellow-400 mt-1">
                Item returns are company-specific. This page is disabled because your Super Admin account is not associated with a company. Please use a company-specific user account or assign your admin account to a company in User Management settings.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-1 overflow-hidden space-x-0 md:space-x-4">
        <div className="w-full md:w-1/3 flex flex-col space-y-4 overflow-y-auto p-1 pr-2 md:border-r md:border-border">
          <fieldset disabled={isSuperAdminWithoutCompany}>
            <div>
              <Label htmlFor="bill-search" className="text-card-foreground">Search Original Bills (Bill No / Customer / Date)</Label>
              <div className="flex space-x-2 mt-1 relative">
              <Popover open={isSuggestionsOpen} onOpenChange={setIsSuggestionsOpen}>
                  <PopoverAnchor asChild>
                      <div className="relative w-full">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input ref={searchInputRef} id="bill-search" placeholder="Type to search..." value={billNumberSearch} onChange={(e) => setBillNumberSearch(e.target.value)} onKeyDown={handleKeyDownOnSearch} onFocus={() => { if (billNumberSearch.trim() && searchSuggestions.length > 0) setIsSuggestionsOpen(true);}} className="bg-input border-border focus:ring-primary text-card-foreground pl-10" disabled={isLoading} autoComplete="off" />
                      </div>
                  </PopoverAnchor>
                  <PopoverContent ref={suggestionsPopoverContentRef} className="w-[--radix-popover-trigger-width] p-0 max-h-60 overflow-y-auto shadow-lg rounded-md mt-1 bg-card border-border" align="start" onOpenAutoFocus={(e) => e.preventDefault()} >
                      {searchSuggestions.length > 0 && ( <div className="py-1" role="listbox"> {searchSuggestions.map((sale, index) => ( <Button key={sale.id} variant="ghost" className={`w-full justify-start h-auto py-2 px-3 text-left rounded-md text-sm text-card-foreground ${ index === activeSuggestionIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50' }`} onClick={() => handleBillSelect(sale)} onMouseEnter={() => setActiveSuggestionIndex(index)} > <div className="flex flex-col w-full"> <div className="flex items-center"> <span className="font-medium">{sale.billNumber}</span> {getStatusBadgeForListItem(sale)} </div> <span className="text-xs text-muted-foreground"> {new Date(sale.date).toLocaleDateString()} {sale.customerName && ` - ${sale.customerName}`} - Total: Rs. {(sale.totalAmount ?? 0).toFixed(2)} </span></div> {index === activeSuggestionIndex && <Check className="ml-auto h-4 w-4 flex-shrink-0" />} </Button>))} </div>)}
                  </PopoverContent>
               </Popover>
                <Button onClick={() => handleSearchSaleContext(billNumberSearch.trim())} disabled={isLoading || !billNumberSearch.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90"> <Search className="mr-2 h-4 w-4" /> {isLoading ? "Searching..." : "Search"} </Button>
              </div>
            </div>
          </fieldset>
          <Separator className="bg-border/50" />
           <fieldset disabled={isSuperAdminWithoutCompany} className="flex-1 flex flex-col overflow-hidden">
                 <ScrollArea className="h-full border border-border rounded-md bg-card">
                    <div className="p-2 space-y-1">
                        {isFetchingHistory && allSalesForHistoryList.length === 0 && !isSuperAdminWithoutCompany ? (Array.from({ length: 5 }).map((_, i) => (<Skeleton key={`skel-orig-${i}`} className="h-12 w-full rounded-md bg-muted/50 mb-1" />)))
                         : allSalesForHistoryList.length > 0 ? (
                            allSalesForHistoryList.map(sale => (
                            <Button key={sale.id} variant="ghost" className="w-full h-auto justify-start text-left p-2 hover:bg-muted/50 text-card-foreground" onClick={() => handleBillSelect(sale)}>
                                <div className="flex flex-col"> <div className="flex items-center"> <span className="text-sm font-medium">{sale.billNumber}</span> {getStatusBadgeForListItem(sale)} </div> <span className="text-xs text-muted-foreground">{new Date(sale.date).toLocaleDateString()} {sale.customerName && `- ${sale.customerName}`} - Total: Rs. {(sale.totalAmount ?? 0).toFixed(2)}</span> </div>
                            </Button>))
                        ) : (<p className="text-sm text-muted-foreground text-center py-3">No original bills found.</p>)}
                    </div>
                </ScrollArea>
           </fieldset>
           <div className="flex justify-between items-center mt-2 flex-shrink-0">
                <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetchingHistory || isSuperAdminWithoutCompany} variant="outline" size="sm"> <ChevronLeft className="h-4 w-4 mr-1" /> Prev </Button>
                <span className="text-xs text-muted-foreground">Page {currentPage} of {maxPage}</span>
                <Button onClick={() => setCurrentPage(p => Math.min(maxPage, p + 1))} disabled={currentPage === maxPage || isFetchingHistory || isSuperAdminWithoutCompany} variant="outline" size="sm"> Next <ChevronRight className="h-4 w-4 ml-1" /> </Button>
            </div>
        </div>

        <div className="w-full md:w-2/3 flex flex-col space-y-3 overflow-y-auto p-1 md:pl-2">
          <fieldset disabled={isSuperAdminWithoutCompany} className="flex-1 flex flex-col space-y-2 pt-0">
            {isLoading && !pristineOriginalSaleForDisplay && (<div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground"><Search className="h-12 w-12 mb-3 animate-pulse" /><p>Searching for sale...</p></div>)}
            
            <div className="flex-1 flex flex-col space-y-2 pt-0">
              <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue} className="w-full text-xs mb-2 border border-border rounded-md bg-card p-1">
                
                <AccordionItem value="original-sale-details" className="border-b border-blue-800/50">
                   <AccordionTrigger className="py-1.5 text-blue-400 hover:text-blue-300 [&[data-state=open]>svg]:text-blue-500 text-sm font-semibold">
                      <Copy className="inline-block h-4 w-4 mr-2 text-blue-500" /> Original Bill Details: {pristineOriginalSaleForDisplay?.billNumber || 'N/A'}
                   </AccordionTrigger>
                    <AccordionContent className="pt-1 pb-2 space-y-1">
                        {pristineOriginalSaleForDisplay ? (
                            <div className="p-3 space-y-1.5 rounded-md bg-blue-950/80 border border-blue-800/60 text-xs text-blue-300">
                                <p><strong className="text-blue-200">Bill No:</strong> {pristineOriginalSaleForDisplay.billNumber} <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-sky-800 text-sky-200">{pristineOriginalSaleForDisplay.status.replace(/_/g, ' ')}</span></p>
                                <p><strong className="text-blue-200">Original Date:</strong> {new Date(pristineOriginalSaleForDisplay.date).toLocaleString()}</p>
                                {pristineOriginalSaleForDisplay.customerName && <p><strong className="text-blue-200">Customer:</strong> {pristineOriginalSaleForDisplay.customerName}</p>}
                                
                                  <p className="font-medium mt-1 text-blue-200">Items (Original Bill):</p>
                                  <Table className="text-xs my-1"><TableHeader><TableRow className="border-b-blue-700/40 hover:bg-blue-900/40"><TableHead className="h-6 text-blue-400">Item</TableHead><TableHead className="h-6 text-center text-blue-400">Qty</TableHead><TableHead className="h-6 text-right text-blue-400">Unit Price</TableHead><TableHead className="h-6 text-right text-sky-400">Line Disc.</TableHead><TableHead className="h-6 text-right text-blue-400">Eff. Price/Unit</TableHead><TableHead className="h-6 text-right text-blue-400">Line Total</TableHead></TableRow></TableHeader>
                                    <TableBody>{pristineOriginalSaleForDisplay.items.map(item => { const lineDiscountOriginal = item.totalDiscountOnLine; const lineTotalNetOriginal = item.effectivePricePaidPerUnit * item.quantity; return (<TableRow key={`orig-${item.productId}`} className="border-b-blue-700/40 hover:bg-blue-900/40"><TableCell className="py-1 text-blue-300">{item.name}</TableCell><TableCell className="py-1 text-center text-blue-300">{`${item.quantity} ${item.units.baseUnit}`.trim()}</TableCell><TableCell className="py-1 text-right text-blue-300">Rs. {item.priceAtSale.toFixed(2)}</TableCell><TableCell className="py-1 text-right text-sky-400">Rs. {lineDiscountOriginal.toFixed(2)}</TableCell><TableCell className="py-1 text-right text-blue-300">Rs. {item.effectivePricePaidPerUnit.toFixed(2)}</TableCell><TableCell className="py-1 text-right text-blue-300">Rs. {lineTotalNetOriginal.toFixed(2)}</TableCell></TableRow>);
                                        })}</TableBody></Table>
                                <p className="font-medium mt-1 text-blue-200">Original Financial Summary:</p>{renderFinancialSummary(pristineOriginalSaleForDisplay, "Original Purchase")}
                                {pristineOriginalSaleForDisplay.appliedDiscountSummary && pristineOriginalSaleForDisplay.appliedDiscountSummary.filter(d => d.totalCalculatedDiscount > 0).length > 0 && (<><p className="font-medium mt-1 text-blue-200">Original Discounts Applied (Summary):</p>{pristineOriginalSaleForDisplay.appliedDiscountSummary.filter(d => d.totalCalculatedDiscount > 0).map((discount, index) => (<div key={`orig_disc_sum_${index}`} className="text-sky-400 text-xs ml-2"><Info className="inline-block h-3 w-3 mr-1" />{discount.sourceRuleName} ({discount.discountCampaignName} - {discount.ruleType.replace(/_/g, ' ').replace('product config ', 'Prod. ').replace('campaign default ', 'Def. ')}{discount.appliedOnce ? ", once" : ""}): -Rs. {discount.totalCalculatedDiscount.toFixed(2)}{discount.productIdAffected && <span className="text-xs text-blue-500 ml-1">(For: {pristineOriginalSaleForDisplay?.items.find(i => i.productId === discount.productIdAffected)?.name.substring(0,15) || discount.productIdAffected.substring(0,10)}...)</span>}</div>))}</>)}
                            </div>
                        ) : (<p className="text-sm text-muted-foreground p-3">Original bill details will load here once a bill is selected.</p>)}
                    </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="adjusted-sale-details" className="border-b border-green-800/50">
                    <AccordionTrigger className="py-1.5 text-green-400 hover:text-green-300 [&[data-state=open]>svg]:text-green-500 text-sm font-semibold">
                      <FileDiff className="inline-block h-4 w-4 mr-2 text-green-500" /> Current Active Bill: {latestAdjustedSaleForDisplay?.billNumber || 'N/A'}
                    </AccordionTrigger>
                    <AccordionContent className="pt-1 pb-2 space-y-1">
                      {latestAdjustedSaleForDisplay ? (
                          <div className="p-3 space-y-1.5 rounded-md bg-green-950/30 border border-green-800/40 text-xs text-green-300">
                              <p><strong className="text-green-200">Bill No:</strong> {latestAdjustedSaleForDisplay.billNumber} <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-green-700 text-green-100">{latestAdjustedSaleForDisplay.status.replace(/_/g, ' ')}</span></p>
                              <p><strong className="text-green-200">Last Update Date:</strong> {new Date(latestAdjustedSaleForDisplay.date).toLocaleString()}</p>
                              <p className="font-medium mt-1 text-green-200">Items (Active Bill):</p>
                              <Table className="text-xs my-1"><TableHeader><TableRow className="border-b-green-800/50 hover:bg-green-900/40 bg-green-900/30"><TableHead className="h-6 text-green-300">Item</TableHead><TableHead className="h-6 text-center text-green-300">Qty Kept</TableHead><TableHead className="h-6 text-right text-green-300">Unit Price (Orig)</TableHead><TableHead className="h-6 text-right text-green-500">Line Disc. (Re-eval)</TableHead><TableHead className="h-6 text-right text-green-300">Eff. Price/Unit (Re-eval)</TableHead><TableHead className="h-6 text-right text-green-300">Line Total (Net)</TableHead></TableRow></TableHeader>
                                  <TableBody>{latestAdjustedSaleForDisplay.items.map(item => { const lineDiscountReevaluated = item.totalDiscountOnLine || 0; const lineTotalNetReevaluated = item.effectivePricePaidPerUnit * item.quantity; return (<TableRow key={`adj-${item.productId}`} className="border-b-green-800/50 hover:bg-green-900/40"><TableCell className="py-1 text-green-400">{item.name}</TableCell><TableCell className="py-1 text-center text-green-400">{`${item.quantity} ${item.units.baseUnit}`.trim()}</TableCell><TableCell className="py-1 text-right text-green-400">Rs. {item.priceAtSale.toFixed(2)}</TableCell><TableCell className="py-1 text-right text-green-500">Rs. {lineDiscountReevaluated.toFixed(2)}</TableCell><TableCell className="py-1 text-right text-green-400">Rs. {item.effectivePricePaidPerUnit.toFixed(2)}</TableCell><TableCell className="py-1 text-right text-green-400">Rs. {lineTotalNetReevaluated.toFixed(2)}</TableCell></TableRow>);})}
                                  {latestAdjustedSaleForDisplay.items.length === 0 && <TableRow className="border-b-green-800/50 hover:bg-green-900/40"><TableCell colSpan={6} className="text-center py-2 text-green-600">All items returned from this bill.</TableCell></TableRow>}
                                  </TableBody>
                              </Table>
                              <p className="font-medium mt-1 text-green-200">Active Bill Financial Summary:</p>{renderFinancialSummary(latestAdjustedSaleForDisplay, "Active Bill", true)}
                              {latestAdjustedSaleForDisplay.appliedDiscountSummary && latestAdjustedSaleForDisplay.appliedDiscountSummary.filter(d => d.totalCalculatedDiscount > 0).length > 0 && (<><p className="font-medium mt-1 text-green-200">Re-evaluated Item Discounts (Summary):</p>{latestAdjustedSaleForDisplay.appliedDiscountSummary.filter(d => d.totalCalculatedDiscount > 0).map((discount, index) => (<div key={`adj_disc_sum_${index}`} className="text-green-500 text-xs ml-2"><Info className="inline-block h-3 w-3 mr-1" />{discount.sourceRuleName} ({discount.discountCampaignName} - {discount.ruleType.replace(/_/g, ' ').replace('product config ', 'Prod. ').replace('campaign default ', 'Def. ')}{discount.appliedOnce ? ", once" : ""}): -Rs. {discount.totalCalculatedDiscount.toFixed(2)}</div>))}</>)}
                          </div>
                      ) : (<p className="text-sm text-muted-foreground p-3">Current active bill details will load here.</p>)}
                    </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="return-history" className="border-b border-red-800/50">
                    <AccordionTrigger className="py-1.5 text-red-400 hover:text-red-300 [&[data-state=open]>svg]:text-red-500 text-sm font-semibold">
                      <History className="inline-block h-4 w-4 mr-2 text-red-500" /> View Return History Log for Bill {pristineOriginalSaleForDisplay?.billNumber || 'N/A'}
                    </AccordionTrigger>
                    <AccordionContent className="pt-1 pb-2">
                      {(saleForReturnLogDisplay?.returnedItemsLog && Array.isArray(saleForReturnLogDisplay.returnedItemsLog) && (saleForReturnLogDisplay.returnedItemsLog as ReturnedItemDetail[]).filter(log => !log.isUndone).length > 0) ? (
                          <div className="p-2 space-y-1 rounded-md bg-red-950 border border-red-800">
                              <Table className="text-xs">
                                  <TableHeader><TableRow className="border-b-red-700 hover:bg-red-800/70"><TableHead className="text-red-200 h-8">Return Date</TableHead><TableHead className="text-red-200 h-8">Return Txn ID</TableHead><TableHead className="text-red-200 h-8">Item</TableHead><TableHead className="text-center text-red-200 h-8">Qty Rtn.</TableHead><TableHead className="text-right text-red-200 h-8">Unit Price (Orig)</TableHead><TableHead className="text-right text-red-200 h-8">Refund/Unit</TableHead><TableHead className="text-right text-red-200 h-8">Total Refund</TableHead><TableHead className="text-center text-red-200 h-8">Actions</TableHead></TableRow></TableHeader>
                                  <TableBody>{(saleForReturnLogDisplay?.returnedItemsLog || []).map((logEntry, index) => {
                                        if (logEntry.isUndone) return null;
                                        const originalItemDetails = pristineOriginalSaleForDisplay?.items.find(i => i.productId === logEntry.itemId); const priceAtSaleForLog = originalItemDetails?.priceAtSale || logEntry.refundAmountPerUnit; return (<TableRow key={`return_log_${logEntry.id}`} className="border-b-red-700/60 hover:bg-red-800/70"><TableCell className="text-red-300 py-1.5">{new Date(logEntry.returnDate).toLocaleDateString()} {new Date(logEntry.returnDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell><TableCell className="text-red-400 py-1.5 text-xs">{logEntry.returnTransactionId}</TableCell><TableCell className="text-red-200 py-1.5">{logEntry.name}</TableCell><TableCell className="text-center text-red-200 py-1.5">{`${logEntry.returnedQuantity} ${logEntry.units.baseUnit}`.trim()}</TableCell><TableCell className="text-right text-red-200 py-1.5">Rs. {priceAtSaleForLog.toFixed(2)}</TableCell><TableCell className="text-right text-red-200 py-1.5">Rs. {logEntry.refundAmountPerUnit.toFixed(2)}</TableCell><TableCell className="text-right text-red-200 py-1.5">Rs. {logEntry.totalRefundForThisReturnEntry.toFixed(2)}</TableCell><TableCell className="text-center py-1.5"><Button variant="ghost" size="icon" className="h-6 w-6 text-amber-400 hover:text-amber-300" onClick={() => handleAttemptUndoReturnItem(logEntry)} title={hasUpdateSalePermission ? "Undo this specific item return" : "You don't have permission to undo returns"} disabled={!hasUpdateSalePermission}><Undo2 className="h-4 w-4" /></Button></TableCell></TableRow>);})}</TableBody>
                              </Table>
                              {totalLoggedRefundAmount > 0 && (<div className="mt-2 p-2 border-t border-red-700/60 text-right bg-red-900/30 rounded-b-md"><span className="text-sm font-medium text-red-300">Total Refunded (All Active Returns): </span><span className="text-sm font-bold text-red-200">Rs. {totalLoggedRefundAmount.toFixed(2)}</span></div>)}
                          </div>
                      ) : (<p className="text-sm text-muted-foreground p-3">No active returns logged for this bill.</p>)}
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="items-for-return" className="border-b-0">
                    <AccordionTrigger className="py-1.5 text-orange-400 hover:text-orange-300 [&[data-state=open]>svg]:text-orange-500 text-sm font-semibold">
                      <ListChecks className="inline-block h-4 w-4 mr-2 text-orange-500" /> Select Items for New Return Transaction (from Bill: {latestAdjustedSaleForDisplay?.billNumber || 'N/A'})
                    </AccordionTrigger>
                    <AccordionContent className="pt-1 pb-2">
                       <ScrollArea className="flex-shrink-0 border border-orange-700 rounded-md bg-orange-950/50 min-h-[150px]">
                          <Table><TableHeader><TableRow className="bg-orange-800/60 sticky top-0 z-[1] hover:bg-orange-800/70 border-b-orange-700"><TableHead className="text-orange-200 py-1.5">Item</TableHead><TableHead className="text-center text-orange-200 py-1.5">Qty in Bill</TableHead><TableHead className="text-right text-orange-200 py-1.5">Unit Price (Orig)</TableHead><TableHead className="text-right text-orange-400 py-1.5">Line Disc. (In Bill)</TableHead><TableHead className="text-right text-orange-200 py-1.5">Eff. Price/Unit (In Bill)</TableHead><TableHead className="text-right text-orange-300 font-medium py-1.5">Line Total (Net In Bill)</TableHead><TableHead className="w-32 text-center text-orange-200 py-1.5">Qty to Return Now</TableHead></TableRow></TableHeader>
                            <TableBody>{itemsToReturnUiList.length > 0 ? itemsToReturnUiList.map(item => { const currentLineDiscount = (item.priceAtSale - item.effectivePricePaidPerUnit) * item.quantity; const currentLineNetTotal = item.effectivePricePaidPerUnit * item.quantity; return (<TableRow key={`ret-item-${item.productId}`} className={`hover:bg-orange-900/60 border-b-orange-800/50 ${item.quantity === 0 ? 'opacity-60' : ''}`}><TableCell className="text-orange-300 py-1">{item.name}</TableCell><TableCell className="text-center text-orange-300 py-1">{`${item.quantity} ${item.units.baseUnit}`.trim()}</TableCell><TableCell className="text-right text-orange-300 py-1">Rs. {item.priceAtSale.toFixed(2)}</TableCell><TableCell className="text-right text-orange-400 py-1">Rs. {currentLineDiscount.toFixed(2)}</TableCell><TableCell className="text-right text-orange-300 py-1">Rs. {item.effectivePricePaidPerUnit.toFixed(2)}</TableCell><TableCell className="text-right text-orange-300 font-medium py-1">Rs. {currentLineNetTotal.toFixed(2)}</TableCell><TableCell className="text-center py-1"><Input type="number" min="0" max={item.quantity} value={item.returnQuantity.toString()} onChange={(e) => handleReturnQuantityChange(item.productId, e.target.value)} className="w-20 h-8 bg-orange-950 border-orange-600 focus:ring-orange-500 text-orange-200 text-center p-1 text-sm" disabled={isLoading || item.quantity === 0}/></TableCell></TableRow>);
                              }) : (<TableRow className="border-b-orange-800/50"><TableCell colSpan={7} className="text-center py-4 text-orange-500/70">{latestAdjustedSaleForDisplay ? 'No items available for return in the current bill state.' : 'Load a sale to see items.'}</TableCell></TableRow>)}</TableBody></Table>
                        </ScrollArea>
                        {itemsToReturnUiList.some(item => item.returnQuantity > 0) && (<div className="mt-2 p-3 border-t border-orange-700/60 text-right bg-orange-950/50 rounded-b-md"><span className="text-sm font-medium text-orange-300">Total Expected Refund (This Transaction): </span><span className="text-sm font-bold text-orange-200">Rs. {totalExpectedRefundForNewTransaction.toFixed(2)}</span></div>)}
                    </AccordionContent>
                </AccordionItem>
              </Accordion>
                
              
                {lastProcessedReturn && lastProcessedReturn.returnTransactionRecord && (<div className="mt-4 p-3 border border-dashed border-primary/50 rounded-md bg-primary/10 flex-shrink-0"><h4 className="text-md font-medium text-primary mb-2 flex items-center"><FileText className="mr-2 h-5 w-5" /> Last Return Transaction Details</h4><p className="text-xs text-muted-foreground">Return Txn Bill No: <span className="font-semibold text-foreground">{lastProcessedReturn.returnTransactionRecord.billNumber}</span></p><p className="text-xs text-muted-foreground">Total Refunded (This Txn): <span className="font-semibold text-foreground">Rs. {lastProcessedReturn.returnTransactionRecord.totalAmount?.toFixed(2)}</span></p><p className="text-xs text-muted-foreground">Current Adjusted Bill ({lastProcessedReturn.currentAdjustedSaleAfterReturn.billNumber}) Total: <span className="font-semibold text-foreground">Rs. {lastProcessedReturn.currentAdjustedSaleAfterReturn.totalAmount?.toFixed(2)}</span></p><p className="text-xs text-muted-foreground">Original Sale Bill ({pristineOriginalSaleForDisplay?.billNumber}) Status: <span className="font-semibold text-foreground">{latestAdjustedSaleForDisplay?.status.replace(/_/g, ' ')}</span></p></div>)}
                 <div className="flex justify-between items-center mt-auto pt-3 flex-shrink-0">
                    {lastProcessedReturn && lastProcessedReturn.returnTransactionRecord && pristineOriginalSaleForDisplay && lastProcessedReturn.currentAdjustedSaleAfterReturn && (<Button variant="outline" onClick={handlePrintCombinedReceipt} className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"><Printer className="mr-2 h-4 w-4" /> Print Combined Receipt</Button>)}
                    <Button type="button" onClick={handleProcessReturn} disabled={isLoading || !pristineOriginalSaleForDisplay || itemsToReturnUiList.every(item => item.returnQuantity === 0) || itemsToReturnUiList.length === 0} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 ml-auto"><Undo className="mr-2 h-4 w-4" /> {isLoading ? "Processing..." : "Process Current Return"}</Button>
                </div>
            </div>
            
            {!pristineOriginalSaleForDisplay && !isLoading && !isFetchingHistory && (!billNumberSearch || searchSuggestions.length === 0) && (<div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-muted-foreground"><PackageOpen className="h-16 w-16 mb-3 text-primary" /><p className="text-lg">Search for a bill or select from the list to begin.</p><p className="text-sm">Loaded sale details will appear here.</p></div>)}
          </fieldset>
        </div>
      </div>
      {isReturnReceiptVisible && lastProcessedReturn && pristineOriginalSaleForDisplay && lastProcessedReturn.currentAdjustedSaleAfterReturn && (<div id="printable-return-receipt-content-holder" style={{ display: 'none' }}><ReturnReceiptPrintContent originalSale={pristineOriginalSaleForDisplay} adjustedSale={lastProcessedReturn.currentAdjustedSaleAfterReturn} returnTransaction={lastProcessedReturn.returnTransactionRecord}/></div>)}
      {itemToUndo && (
        <AlertDialog open={undoConfirmationOpen} onOpenChange={setUndoConfirmationOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Undo Return for "{itemToUndo.itemName}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will reverse the return of this specific item.
                        Stock will be decreased, and the bill will be re-adjusted. This action cannot be undone directly.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => { setUndoConfirmationOpen(false); setItemToUndo(null);}} disabled={isLoading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmUndoReturnItem} disabled={isLoading} className="bg-amber-500 hover:bg-amber-600">
                        {isLoading ? "Undoing..." : "Confirm Undo"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
