'use client';

import { Separator } from "@/components/ui/separator";
import type { AppliedRuleInfo } from "@/types";
import { Button } from "@/components/ui/button";
import { Info, Gift } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SaleSummaryProps {
  subtotalOriginal: number;
  totalItemDiscountAmount: number;
  totalCartDiscountAmount: number;
  tax: number;
  total: number;
  taxRate: number;
  appliedDiscountSummary: AppliedRuleInfo[];
  onOpenDiscountInfoDialog: (ruleInfo: AppliedRuleInfo) => void;
}

export function SaleSummary({
  subtotalOriginal,
  totalItemDiscountAmount,
  totalCartDiscountAmount,
  tax,
  total,
  taxRate,
  appliedDiscountSummary,
  onOpenDiscountInfoDialog,
}: SaleSummaryProps) {
  const subtotalAfterItemDiscounts = subtotalOriginal - totalItemDiscountAmount;
  const netSubtotal = subtotalAfterItemDiscounts - totalCartDiscountAmount;
  const totalAllAppliedDiscountsValue = totalItemDiscountAmount + totalCartDiscountAmount;

  const itemLevelDiscounts = appliedDiscountSummary.filter(d => 
    (d.ruleType.startsWith('product_config_') || 
    d.ruleType.startsWith('campaign_default_')) &&
    d.ruleType !== 'buy_get_free'
  );
  
  const buyGetDiscounts = appliedDiscountSummary.filter(d => d.ruleType === 'buy_get_free');

  const cartLevelDiscounts = appliedDiscountSummary.filter(d => d.ruleType.startsWith('campaign_global_'));


  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Subtotal (Original)</span>
        <span>Rs. {subtotalOriginal.toFixed(2)}</span>
      </div>

      {totalAllAppliedDiscountsValue > 0 && (
        <div className="flex justify-between font-semibold text-green-500 pt-1">
          <span>Total All Applied Discounts</span>
          <span>-Rs. {totalAllAppliedDiscountsValue.toFixed(2)}</span>
        </div>
      )}

      {appliedDiscountSummary.length > 0 && (
        <Accordion type="single" collapsible className="w-full text-xs">
          <AccordionItem value="item-1" className="border-b-0">
            <AccordionTrigger className="py-2 text-muted-foreground hover:text-foreground [&[data-state=open]>svg]:text-primary">
              View Discount Details
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-2 space-y-2">
              <div className="p-3 ml-1 space-y-2 rounded-md bg-black/20 border border-border/40">

                {itemLevelDiscounts.length > 0 && (
                  <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Item Level Details:</span>
                      {itemLevelDiscounts.map((discount, index) => (
                          <div key={`${discount.sourceRuleName}-${discount.productIdAffected || 'item'}-${index}`} className="flex justify-between items-center text-green-400 text-xs">
                            <div className="flex items-center">
                              <span>{discount.sourceRuleName} ({discount.discountCampaignName})</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 text-blue-400 hover:text-blue-600" onClick={() => onOpenDiscountInfoDialog(discount)}>
                                  <Info className="h-3 w-3" />
                              </Button>
                            </div>
                            <span>-Rs. {discount.totalCalculatedDiscount.toFixed(2)}</span>
                          </div>
                      ))}
                  </div>
                )}
                
                {buyGetDiscounts.length > 0 && (
                  <div className="space-y-1 mt-2">
                      <span className="text-xs text-muted-foreground flex items-center"><Gift className="mr-1.5 h-3 w-3 text-rose-400" /> "Buy & Get" Offer Details:</span>
                      {buyGetDiscounts.map((discount, index) => (
                           <div key={`buy-get-${discount.sourceRuleName}-${index}`} className="flex justify-between items-center text-rose-400 text-xs">
                              <div className="flex items-center">
                                <span>{discount.sourceRuleName}</span>
                                <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 text-blue-400 hover:text-blue-600" onClick={() => onOpenDiscountInfoDialog(discount)}>
                                    <Info className="h-3 w-3" />
                                </Button>
                              </div>
                              <span>-Rs. {discount.totalCalculatedDiscount.toFixed(2)}</span>
                           </div>
                      ))}
                  </div>
                )}

                {totalItemDiscountAmount > 0 && (
                  <div className="flex justify-between font-medium border-t border-dashed border-border/50 pt-1 mt-1 text-xs">
                      <span>Total Item & Offer Discounts</span>
                      <span>-Rs. {totalItemDiscountAmount.toFixed(2)}</span>
                  </div>
                )}


                 <div className="flex justify-between mt-1">
                   <span>Subtotal After Item Discounts</span>
                   <span>Rs. {subtotalAfterItemDiscounts.toFixed(2)}</span>
                 </div>


                {cartLevelDiscounts.length > 0 && (
                  <div className="space-y-1 mt-2">
                      <span className="text-xs text-muted-foreground">Cart Level Details:</span>
                      {cartLevelDiscounts.map((discount, index) => (
                          <div key={`${discount.sourceRuleName}-cart-${index}`} className="flex justify-between items-center text-green-400 text-xs">
                             <div className="flex items-center">
                              <span>{discount.sourceRuleName} ({discount.discountCampaignName})</span>
                               <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 text-blue-400 hover:text-blue-600" onClick={() => onOpenDiscountInfoDialog(discount)}>
                                  <Info className="h-3 w-3" />
                              </Button>
                             </div>
                            <span>-Rs. {discount.totalCalculatedDiscount.toFixed(2)}</span>
                          </div>
                      ))}
                       {totalCartDiscountAmount > 0 && (
                        <div className="flex justify-between font-medium border-t border-dashed border-border/50 pt-1 mt-1 text-xs">
                            <span>Total Cart Discounts</span>
                            <span>-Rs. {totalCartDiscountAmount.toFixed(2)}</span>
                        </div>
                       )}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      
      <div className="flex justify-between font-semibold pt-1 border-t border-border">
        <span>Net Subtotal (After All Discounts)</span>
        <span>Rs. {netSubtotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>Tax ({ (taxRate * 100).toFixed(taxRate === 0 ? 0 : (taxRate * 100 % 1 === 0 ? 0 : 2)) }%)</span>
        <span>Rs. {tax.toFixed(2)}</span>
      </div>
      <Separator className="my-2 bg-border" />
      <div className="flex justify-between font-bold text-lg text-primary">
        <span>Total</span>
        <span>Rs. {total.toFixed(2)}</span>
      </div>
    </div>
  );
}
