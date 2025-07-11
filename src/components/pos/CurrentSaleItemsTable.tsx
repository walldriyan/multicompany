'use client';

import type { SaleItem } from '@/types'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Plus, Minus, Trash2, Search as SearchIcon } from 'lucide-react'; 
import { useSelector } from 'react-redux';
import { selectCalculatedDiscounts } from '@/store/slices/saleSlice';
import { getDisplayQuantityAndUnit } from '@/lib/unitUtils';

interface CurrentSaleItemsTableProps {
  items: SaleItem[];
  onQuantityChange: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
}

export function CurrentSaleItemsTable({ items, onQuantityChange, onRemoveItem }: CurrentSaleItemsTableProps) {
  const { itemDiscounts: calculatedItemDiscountsMap } = useSelector(selectCalculatedDiscounts);

  if (!items || items.length === 0) {
    return (
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-center text-muted-foreground h-full">
            <SearchIcon className="h-16 w-16 mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">Find Products via Search</p>
            <p className="text-sm">Use the search bar above to find products and add them to your sale.</p>
            <p className="text-sm mt-1">Added items will appear here.</p>
        </div>
    );
  }

  const handleQuantityInput = (itemId: string, value: string) => {
    const newQuantity = parseFloat(value);
    if (value === "" || value === "-") return; // Allow typing negative or being empty temporarily
    if (!isNaN(newQuantity)) { 
      onQuantityChange(itemId, newQuantity);
    }
  };
  
  const incrementQuantity = (item: SaleItem) => {
    onQuantityChange(item.id, item.quantity + 1);
  };

  const decrementQuantity = (item: SaleItem) => {
    onQuantityChange(item.id, item.quantity - 1);
  };

  const getDiscountDisplayForItem = (itemId: string) => {
    const discountInfo = calculatedItemDiscountsMap.get(itemId);
    const item = items.find(i => i.id === itemId);
    if (discountInfo && discountInfo.totalCalculatedDiscountForLine > 0 && item) {
      if (discountInfo.appliedOnce && discountInfo.totalCalculatedDiscountForLine > 0) {
          return `${discountInfo.ruleName} (-Rs. ${discountInfo.totalCalculatedDiscountForLine.toFixed(2)} total for line)`;
      }
      return `${discountInfo.ruleName} (-Rs. ${discountInfo.perUnitEquivalentAmount.toFixed(2)} per ${item.units.baseUnit})`;
    }
    return 'No Item Discount';
  };


  return (
    <ScrollArea className="h-full rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 sticky top-0 z-[1]">
            <TableHead className="min-w-[120px] text-foreground">Name</TableHead>
            <TableHead className="text-right text-foreground">Unit Price</TableHead>
            <TableHead className="min-w-[150px] text-foreground">Item Discount</TableHead>
            <TableHead className="w-[180px] text-center text-foreground">Quantity</TableHead>
            <TableHead className="text-right text-foreground">Line Total</TableHead>
            <TableHead className="w-[80px] text-center text-foreground">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const itemDiscountInfo = calculatedItemDiscountsMap.get(item.id);
            const perUnitEquivalentDiscountAmount = itemDiscountInfo?.perUnitEquivalentAmount || 0;
            const originalUnitPrice = item.price ?? 0;
            const discountedPricePerBaseUnit = originalUnitPrice - perUnitEquivalentDiscountAmount;
            const lineTotal = discountedPricePerBaseUnit * item.quantity;
            const lineTotalWithoutDiscount = originalUnitPrice * item.quantity;
            const { displayQuantity, displayUnit } = getDisplayQuantityAndUnit(item.quantity, item.units);

            return (
            <TableRow key={item.id} className="hover:bg-muted/20">
              <TableCell className="font-medium text-foreground align-middle">{item.name}</TableCell>
              <TableCell className="text-right text-foreground align-middle">
                Rs. {originalUnitPrice.toFixed(2)} <span className="text-xs text-muted-foreground">/{item.units.baseUnit}</span>
              </TableCell>
              <TableCell className="text-foreground align-middle text-xs" title={getDiscountDisplayForItem(item.id)}>
                {getDiscountDisplayForItem(item.id)}
              </TableCell>
              <TableCell className="text-center align-middle">
                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => decrementQuantity(item)} aria-label="Decrease quantity">
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      type="number"
                      step="any"
                      value={item.quantity.toString()}
                      onChange={(e) => handleQuantityInput(item.id, e.target.value)}
                      onBlur={(e) => { 
                          const val = parseFloat(e.target.value);
                          if(isNaN(val)) onQuantityChange(item.id, item.quantity); // revert if invalid
                      }}
                      className="w-20 h-8 text-center bg-input border-border focus:ring-primary text-sm p-1"
                      min="0" 
                      aria-label="Item quantity in base units"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => incrementQuantity(item)} disabled={!item.isService && item.quantity >= item.stock} aria-label="Increase quantity">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                   {displayUnit !== item.units.baseUnit && (
                     <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                       (Equals: {displayQuantity} {displayUnit})
                     </div>
                   )}
                </div>
              </TableCell>
              <TableCell className="text-right text-foreground align-middle">
                {itemDiscountInfo && itemDiscountInfo.totalCalculatedDiscountForLine > 0 ? (
                  <>
                    <div className="font-medium">
                      Rs. {lineTotal.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground line-through">
                      Rs. {lineTotalWithoutDiscount.toFixed(2)}
                    </div>
                  </>
                ) : (
                  <div className="font-medium">
                    Rs. {lineTotal.toFixed(2)}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-center align-middle">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveItem(item.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
