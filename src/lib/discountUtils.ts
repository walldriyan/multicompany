
import type { SaleItem, DiscountSet, AppliedRuleInfo, SpecificDiscountRuleConfig, Product, BuyGetRule } from '@/types';

function evaluateRule(
  ruleConfig: SpecificDiscountRuleConfig | null,
  itemPrice: number,
  itemQuantity: number,
  itemLineTotalValue: number,
  ruleContext: 'item_value' | 'item_quantity' | 'specific_qty' | 'specific_unit_price'
): number {
  if (!ruleConfig || !ruleConfig.isEnabled) return 0;

  let conditionMet = false;
  let valueToTestCondition = 0;

  switch (ruleContext) {
    case 'item_value': valueToTestCondition = itemLineTotalValue; break;
    case 'item_quantity': valueToTestCondition = itemQuantity; break;
    case 'specific_qty': valueToTestCondition = itemQuantity; break;
    case 'specific_unit_price': valueToTestCondition = itemPrice; break;
    default: return 0;
  }

  conditionMet = (valueToTestCondition >= (ruleConfig.conditionMin ?? 0)) &&
                 (valueToTestCondition <= (ruleConfig.conditionMax ?? Infinity));

  if (!conditionMet) return 0;

  let discountAmount = 0;
  if (ruleConfig.type === 'fixed') {
    if (ruleConfig.applyFixedOnce) {
        discountAmount = ruleConfig.value;
    } else {
        if (ruleContext === 'item_quantity' || ruleContext === 'specific_qty') {
            discountAmount = ruleConfig.value * itemQuantity;
        } else {
            discountAmount = ruleConfig.value * itemQuantity; 
        }
    }
  } else { // percentage
    if (ruleConfig.applyFixedOnce) {
        discountAmount = itemLineTotalValue * (ruleConfig.value / 100);
    } else {
        if (ruleContext === 'item_value') {
             discountAmount = itemLineTotalValue * (ruleConfig.value / 100);
        } else {
            discountAmount = (itemPrice * (ruleConfig.value / 100)) * itemQuantity;
        }
    }
  }
  return Math.max(0, Math.min(discountAmount, itemLineTotalValue));
};


interface CalculateDiscountsInput {
  saleItems: SaleItem[];
  activeCampaign: DiscountSet | null;
  allProducts: Product[];
}

interface CalculatedDiscountsOutput {
  itemDiscounts: Map<string, {
    ruleName: string;
    ruleCampaignName: string;
    perUnitEquivalentAmount: number;
    totalCalculatedDiscountForLine: number;
    ruleType: AppliedRuleInfo['ruleType'];
    appliedOnce: boolean;
  }>;
  cartDiscountsAppliedDetails: AppliedRuleInfo[];
  totalItemDiscountAmount: number;
  totalCartDiscountAmount: number;
  fullAppliedDiscountSummary: AppliedRuleInfo[];
}

export function calculateDiscountsForItems(
  input: CalculateDiscountsInput
): CalculatedDiscountsOutput {
  const { saleItems, activeCampaign, allProducts } = input;

  const itemLevelDiscountsMap = new Map<string, {
    ruleName: string; ruleCampaignName: string; perUnitEquivalentAmount: number;
    totalCalculatedDiscountForLine: number; ruleType: AppliedRuleInfo['ruleType']; appliedOnce: boolean;
  }>();
  let totalItemDiscountSum = 0;
  const globalCartRulesAppliedDetails: AppliedRuleInfo[] = [];
  let totalGlobalCartDiscountSum = 0;
  const detailedAppliedDiscountSummary: AppliedRuleInfo[] = [];


  if (!activeCampaign || !activeCampaign.isActive || saleItems.length === 0) {
    return {
      itemDiscounts: itemLevelDiscountsMap,
      cartDiscountsAppliedDetails: globalCartRulesAppliedDetails,
      totalItemDiscountAmount: 0,
      totalCartDiscountAmount: 0,
      fullAppliedDiscountSummary: [],
    };
  }

  // A temporary map to track remaining quantities for "Buy & Get" offers.
  const tempItemQuantities = new Map(saleItems.map(item => [item.id, item.quantity]));

  // 1. Evaluate Item-Level Discounts (Percentage/Fixed)
  saleItems.forEach(saleItem => {
    const productDetails = allProducts.find(p => p.id === saleItem.id);
    if (!productDetails) return;

    const itemOriginalLineValue = productDetails.sellingPrice * saleItem.quantity;
    let totalDiscountForThisLine = 0;
    
    const productConfigInCampaign = activeCampaign.productConfigurations?.find(
      pc => pc.productId === saleItem.id && pc.isActiveForProductInCampaign
    );

    const rulesToConsiderForItem: { config: SpecificDiscountRuleConfig | null; type: AppliedRuleInfo['ruleType']; context: 'item_value' | 'item_quantity' | 'specific_qty' | 'specific_unit_price' }[] = [];

    if (productConfigInCampaign) {
      rulesToConsiderForItem.push(
        { config: productConfigInCampaign.lineItemValueRuleJson, type: 'product_config_line_item_value', context: 'item_value' },
        { config: productConfigInCampaign.lineItemQuantityRuleJson, type: 'product_config_line_item_quantity', context: 'item_quantity' },
        { config: productConfigInCampaign.specificQtyThresholdRuleJson, type: 'product_config_specific_qty_threshold', context: 'specific_qty' },
        { config: productConfigInCampaign.specificUnitPriceThresholdRuleJson, type: 'product_config_specific_unit_price', context: 'specific_unit_price' }
      );
    } else { // Use campaign's default item rules
      rulesToConsiderForItem.push(
        { config: activeCampaign.defaultLineItemValueRuleJson, type: 'campaign_default_line_item_value', context: 'item_value' },
        { config: activeCampaign.defaultLineItemQuantityRuleJson, type: 'campaign_default_line_item_quantity', context: 'item_quantity' },
        { config: activeCampaign.defaultSpecificQtyThresholdRuleJson, type: 'campaign_default_specific_qty_threshold', context: 'specific_qty' },
        { config: activeCampaign.defaultSpecificUnitPriceThresholdRuleJson, type: 'campaign_default_specific_unit_price', context: 'specific_unit_price' }
      );
    }

    // New logic: Stack all applicable discounts, don't just pick the best.
    rulesToConsiderForItem.forEach(ruleEntry => {
      if (ruleEntry.config && ruleEntry.config.isEnabled) {
        const discountFromThisRule = evaluateRule(ruleEntry.config, productDetails.sellingPrice, saleItem.quantity, itemOriginalLineValue, ruleEntry.context);
        if (discountFromThisRule > 0) {
            totalDiscountForThisLine += discountFromThisRule;
            detailedAppliedDiscountSummary.push({
                discountCampaignName: activeCampaign.name,
                sourceRuleName: ruleEntry.config.name,
                totalCalculatedDiscount: discountFromThisRule,
                ruleType: ruleEntry.type,
                productIdAffected: saleItem.id,
                appliedOnce: !!ruleEntry.config.applyFixedOnce,
            });
        }
      }
    });

    if (totalDiscountForThisLine > 0) {
      const perUnitEquivalent = saleItem.quantity > 0 ? totalDiscountForThisLine / saleItem.quantity : 0;
      itemLevelDiscountsMap.set(saleItem.id, {
        ruleName: detailedAppliedDiscountSummary.filter(d=>d.productIdAffected === saleItem.id).map(d=>d.sourceRuleName).join(', '),
        ruleCampaignName: activeCampaign.name,
        perUnitEquivalentAmount: perUnitEquivalent,
        totalCalculatedDiscountForLine: totalDiscountForThisLine,
        ruleType: 'product_config_line_item_value', // This needs refinement if we want to show multiple rule types
        appliedOnce: false, // This needs refinement
      });
      totalItemDiscountSum += totalDiscountForThisLine;
    }
  });

  // 2. Evaluate "Buy & Get" Rules
  if (activeCampaign.buyGetRulesJson && activeCampaign.buyGetRulesJson.length > 0) {
      activeCampaign.buyGetRulesJson.forEach(rule => {
          let buyProductQtyInCart = tempItemQuantities.get(rule.buyProductId) || 0;
          const buyProductDiscountedByOtherRules = itemLevelDiscountsMap.get(rule.buyProductId);
          // If the 'buy' item itself is discounted, it might not be eligible to trigger a BOGO.
          // For now, we allow it. For stricter rules, uncomment the below:
          // if (buyProductDiscountedByOtherRules && buyProductDiscountedByOtherRules.totalCalculatedDiscountForLine > 0) {
          //   return; 
          // }

          if (buyProductQtyInCart >= rule.buyQuantity) {
              const getProductDetails = allProducts.find(p => p.id === rule.getProductId);
              if (!getProductDetails) return;

              let getProductQtyInCart;
              if (rule.buyProductId === rule.getProductId) {
                  getProductQtyInCart = buyProductQtyInCart;
              } else {
                  getProductQtyInCart = tempItemQuantities.get(rule.getProductId) || 0;
              }
              if (getProductQtyInCart <= 0) return;

              const timesRuleCanApply = rule.isRepeatable ? Math.floor(buyProductQtyInCart / rule.buyQuantity) : 1;
              const maxDiscountableQty = timesRuleCanApply * rule.getQuantity;
              
              const actualDiscountableQty = Math.min(getProductQtyInCart, maxDiscountableQty);

              if (actualDiscountableQty > 0) {
                  let discountPerUnit;
                  if (rule.discountType === 'percentage') {
                    discountPerUnit = getProductDetails.sellingPrice * (rule.discountValue / 100);
                  } else { // fixed
                    discountPerUnit = rule.discountValue;
                  }
                  
                  const totalDiscountFromThisRule = discountPerUnit * actualDiscountableQty;
                  
                  totalItemDiscountSum += totalDiscountFromThisRule;
                  
                  const existingDiscount = itemLevelDiscountsMap.get(rule.getProductId) || {
                      ruleName: '', ruleCampaignName: activeCampaign.name, perUnitEquivalentAmount: 0,
                      totalCalculatedDiscountForLine: 0, ruleType: 'buy_get_free', appliedOnce: false
                  };

                  existingDiscount.totalCalculatedDiscountForLine += totalDiscountFromThisRule;
                  const buyProduct = allProducts.find(p=>p.id===rule.buyProductId);
                  const getProduct = allProducts.find(p=>p.id===rule.getProductId);
                  const ruleNameString = `Buy ${rule.buyQuantity} of ${buyProduct?.name || '...'} Get ${rule.getQuantity} of ${getProduct?.name || '...'}`;
                  
                  existingDiscount.ruleName = (existingDiscount.ruleName ? existingDiscount.ruleName + ', ' : '') + ruleNameString;
                  existingDiscount.perUnitEquivalentAmount = existingDiscount.totalCalculatedDiscountForLine / getProductQtyInCart;

                  itemLevelDiscountsMap.set(rule.getProductId, existingDiscount);
                  
                  detailedAppliedDiscountSummary.push({
                      discountCampaignName: activeCampaign.name,
                      sourceRuleName: ruleNameString,
                      totalCalculatedDiscount: totalDiscountFromThisRule,
                      ruleType: 'buy_get_free',
                      productIdAffected: rule.getProductId,
                      appliedOnce: !rule.isRepeatable,
                  });
              }
          }
      });
  }


  // 3. Apply Global Cart-Level Discounts
  const subtotalAfterAllItemDiscounts = saleItems.reduce((sum, saleItem) => {
    const productInfo = allProducts.find(p => p.id === saleItem.id);
    const itemOriginalPrice = productInfo ? productInfo.sellingPrice : 0;
    const itemDiscountForLine = itemLevelDiscountsMap.get(saleItem.id)?.totalCalculatedDiscountForLine || 0;
    return sum + (itemOriginalPrice * saleItem.quantity) - itemDiscountForLine;
  }, 0);
  const totalCartQuantity = saleItems.reduce((sum, item) => sum + item.quantity, 0);

  const globalCartRulesToProcess = [
    { config: activeCampaign.globalCartPriceRuleJson, type: 'campaign_global_cart_price' as AppliedRuleInfo['ruleType'] },
    { config: activeCampaign.globalCartQuantityRuleJson, type: 'campaign_global_cart_quantity' as AppliedRuleInfo['ruleType'] },
  ];

  // Logic to stack cart-level discounts
  globalCartRulesToProcess.forEach(cartRuleEntry => {
    if (cartRuleEntry.config && cartRuleEntry.config.isEnabled) {
      const cartRule = cartRuleEntry.config;
      let conditionMet = false;
      let valueToTestCondition = 0;

      if (cartRuleEntry.type === 'campaign_global_cart_price') valueToTestCondition = subtotalAfterAllItemDiscounts;
      else if (cartRuleEntry.type === 'campaign_global_cart_quantity') valueToTestCondition = totalCartQuantity;

      conditionMet = (valueToTestCondition >= (cartRule.conditionMin ?? 0)) && (valueToTestCondition <= (cartRule.conditionMax ?? Infinity));

      if (conditionMet) {
        let cartDiscountAmountApplied: number;
        if (cartRule.type === 'fixed') cartDiscountAmountApplied = cartRule.value;
        else cartDiscountAmountApplied = subtotalAfterAllItemDiscounts * (cartRule.value / 100);

        cartDiscountAmountApplied = Math.max(0, Math.min(cartDiscountAmountApplied, subtotalAfterAllItemDiscounts));

        if (cartDiscountAmountApplied > 0) {
            const cartRuleInfo: AppliedRuleInfo = {
                discountCampaignName: activeCampaign.name,
                sourceRuleName: cartRule.name,
                totalCalculatedDiscount: cartDiscountAmountApplied,
                ruleType: cartRuleEntry.type,
                appliedOnce: true,
            };
            totalGlobalCartDiscountSum += cartDiscountAmountApplied;
            globalCartRulesAppliedDetails.push(cartRuleInfo);
            detailedAppliedDiscountSummary.push(cartRuleInfo);
        }
      }
    }
  });

  return {
    itemDiscounts: itemLevelDiscountsMap,
    cartDiscountsAppliedDetails: globalCartRulesAppliedDetails,
    totalItemDiscountAmount: totalItemDiscountSum,
    totalCartDiscountAmount: totalGlobalCartDiscountSum,
    fullAppliedDiscountSummary: detailedAppliedDiscountSummary,
  };
}

    