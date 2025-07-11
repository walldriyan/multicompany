
'use server';

import prisma from '@/lib/prisma';
import { DiscountSetValidationSchema, TaxRateValidationSchema } from '@/lib/zodSchemas';
import type { DiscountSet, SpecificDiscountRuleConfig, ProductDiscountConfiguration, DiscountSetFormData, UnitDefinition as TypesUnitDefinition } from '@/types';
import { Prisma } from '@prisma/client';

const TAX_RATE_CONFIG_KEY = 'taxRate';

function mapPrismaDiscountSetToType(
  dbSet: Prisma.DiscountSetGetPayload<{ 
    include: { 
      productConfigurations: { 
        include: { product: true } 
      } 
    } 
  }>
): DiscountSet {
  return {
    id: dbSet.id,
    name: dbSet.name,
    isActive: dbSet.isActive,
    isDefault: dbSet.isDefault,
    isOneTimePerTransaction: dbSet.isOneTimePerTransaction,
    globalCartPriceRuleJson: dbSet.globalCartPriceRuleJson as SpecificDiscountRuleConfig | null,
    globalCartQuantityRuleJson: dbSet.globalCartQuantityRuleJson as SpecificDiscountRuleConfig | null,
    defaultLineItemValueRuleJson: dbSet.defaultLineItemValueRuleJson as SpecificDiscountRuleConfig | null,
    defaultLineItemQuantityRuleJson: dbSet.defaultLineItemQuantityRuleJson as SpecificDiscountRuleConfig | null,
    defaultSpecificQtyThresholdRuleJson: dbSet.defaultSpecificQtyThresholdRuleJson as SpecificDiscountRuleConfig | null,
    defaultSpecificUnitPriceThresholdRuleJson: dbSet.defaultSpecificUnitPriceThresholdRuleJson as SpecificDiscountRuleConfig | null,
    buyGetRulesJson: dbSet.buyGetRulesJson as any, // Cast to any as Prisma doesn't know the new shape
    createdByUserId: dbSet.createdByUserId,
    updatedByUserId: dbSet.updatedByUserId,
    productConfigurations: dbSet.productConfigurations.map(pc => ({
      id: pc.id,
      discountSetId: pc.discountSetId,
      productId: pc.productId,
      product: pc.product ? {
        id: pc.product.id,
        name: pc.product.name,
        code: pc.product.code,
        category: pc.product.category,
        barcode: pc.product.barcode,
        units: pc.product.units as TypesUnitDefinition,
        sellingPrice: pc.product.sellingPrice,
        costPrice: pc.product.costPrice,
        stock: pc.product.stock,
        defaultQuantity: pc.product.defaultQuantity,
        isActive: pc.product.isActive,
        isService: pc.product.isService,
        productSpecificTaxRate: pc.product.productSpecificTaxRate,
        description: pc.product.description,
        imageUrl: pc.product.imageUrl,
        createdByUserId: pc.product.createdByUserId,
        updatedByUserId: pc.product.updatedByUserId,
      } : undefined,
      productNameAtConfiguration: pc.productNameAtConfiguration,
      isActiveForProductInCampaign: pc.isActiveForProductInCampaign,
      lineItemValueRuleJson: pc.lineItemValueRuleJson as SpecificDiscountRuleConfig | null,
      lineItemQuantityRuleJson: pc.lineItemQuantityRuleJson as SpecificDiscountRuleConfig | null,
      specificQtyThresholdRuleJson: pc.specificQtyThresholdRuleJson as SpecificDiscountRuleConfig | null,
      specificUnitPriceThresholdRuleJson: pc.specificUnitPriceThresholdRuleJson as SpecificDiscountRuleConfig | null,
    })),
  };
}

export async function getDiscountSetsAction(): Promise<{
  success: boolean;
  data?: DiscountSet[];
  error?: string;
}> {
  try {
    const dbDiscountSets = await prisma.discountSet.findMany({
      orderBy: { name: 'asc' },
      include: {
        productConfigurations: {
          include: {
            product: { select: { id: true, name: true, sellingPrice: true, units: true, category:true, code: true, barcode: true, costPrice: true, stock: true, defaultQuantity: true, isActive:true, isService: true, productSpecificTaxRate:true, description:true, imageUrl:true, createdByUserId: true, updatedByUserId: true } } 
          }
        }
      }
    });
    const discountSets: DiscountSet[] = dbDiscountSets.map(mapPrismaDiscountSetToType);
    return { success: true, data: discountSets };
  } catch (error) {
    console.error('Error fetching discount sets:', error);
    return { success: false, error: 'Failed to fetch discount sets.' };
  }
}

export async function saveDiscountSetAction(
  formData: DiscountSetFormData,
  userId: string,
): Promise<{ success: boolean; data?: DiscountSet; error?: string, fieldErrors?: Record<string, string[]> }> {
  const validationResult = DiscountSetValidationSchema.safeParse(formData);
  if (!validationResult.success) {
    return { success: false, error: "Validation failed. Check field errors.", fieldErrors: validationResult.error.flatten().fieldErrors };
  }

  const { id: discountSetId, productConfigurations = [], buyGetRulesJson = [], ...discountSetData } = validationResult.data;

  try {
    const savedDbSet = await prisma.$transaction(async (tx) => {
      if (discountSetData.isDefault) {
        await tx.discountSet.updateMany({
          where: { isDefault: true, NOT: { id: discountSetId || undefined } },
          data: { isDefault: false },
        });
      }

      let currentDiscountSet: Prisma.DiscountSetGetPayload<{ include: { productConfigurations: true } }>;
      const dataForDiscountSet = {
        name: discountSetData.name,
        isActive: discountSetData.isActive,
        isDefault: discountSetData.isDefault,
        isOneTimePerTransaction: discountSetData.isOneTimePerTransaction,
        globalCartPriceRuleJson: discountSetData.globalCartPriceRuleJson || Prisma.DbNull,
        globalCartQuantityRuleJson: discountSetData.globalCartQuantityRuleJson || Prisma.DbNull,
        defaultLineItemValueRuleJson: discountSetData.defaultLineItemValueRuleJson || Prisma.DbNull,
        defaultLineItemQuantityRuleJson: discountSetData.defaultLineItemQuantityRuleJson || Prisma.DbNull,
        defaultSpecificQtyThresholdRuleJson: discountSetData.defaultSpecificQtyThresholdRuleJson || Prisma.DbNull,
        defaultSpecificUnitPriceThresholdRuleJson: discountSetData.defaultSpecificUnitPriceThresholdRuleJson || Prisma.DbNull,
        buyGetRulesJson: buyGetRulesJson.length > 0 ? (buyGetRulesJson as Prisma.JsonValue) : Prisma.DbNull,
      };

      if (discountSetId) {
        currentDiscountSet = await tx.discountSet.update({
          where: { id: discountSetId },
          data: {
            ...dataForDiscountSet,
            updatedByUserId: userId,
          },
          include: { productConfigurations: true },
        });
      } else {
        currentDiscountSet = await tx.discountSet.create({
          data: {
            ...dataForDiscountSet,
            createdByUserId: userId,
            updatedByUserId: userId,
          },
          include: { productConfigurations: true },
        });
      }

      const existingConfigIdsInDb = currentDiscountSet.productConfigurations.map(pc => pc.id);
      const incomingConfigIdsFromForm = productConfigurations.map(pc => pc.id).filter(Boolean) as string[];
      
      const configsToCreate = productConfigurations.filter(pc => !pc.id || !existingConfigIdsInDb.includes(pc.id!));
      const configsToUpdate = productConfigurations.filter(pc => pc.id && existingConfigIdsInDb.includes(pc.id!));
      const configsToDeleteIds = existingConfigIdsInDb.filter(id => !incomingConfigIdsFromForm.includes(id));

      if (configsToDeleteIds.length > 0) {
        await tx.productDiscountConfiguration.deleteMany({
          where: { id: { in: configsToDeleteIds }, discountSetId: currentDiscountSet.id },
        });
      }

      for (const pcFormData of configsToCreate) {
        if (!pcFormData.productId) continue;
        const product = await tx.product.findUnique({ where: {id: pcFormData.productId }});
        if (!product) throw new Error(`Product with ID ${pcFormData.productId} not found.`);
        
        await tx.productDiscountConfiguration.create({
          data: {
            discountSetId: currentDiscountSet.id,
            productId: pcFormData.productId,
            productNameAtConfiguration: product.name,
            isActiveForProductInCampaign: pcFormData.isActiveForProductInCampaign,
            lineItemValueRuleJson: pcFormData.lineItemValueRuleJson || Prisma.DbNull,
            lineItemQuantityRuleJson: pcFormData.lineItemQuantityRuleJson || Prisma.DbNull,
            specificQtyThresholdRuleJson: pcFormData.specificQtyThresholdRuleJson || Prisma.DbNull,
            specificUnitPriceThresholdRuleJson: pcFormData.specificUnitPriceThresholdRuleJson || Prisma.DbNull,
          }
        });
      }
      
      for (const pcFormData of configsToUpdate) {
         if (!pcFormData.productId || !pcFormData.id) continue;
         const product = await tx.product.findUnique({ where: {id: pcFormData.productId }});
         if (!product) throw new Error(`Product with ID ${pcFormData.productId} not found for update.`);

        await tx.productDiscountConfiguration.update({
            where: { id: pcFormData.id },
            data: {
                productId: pcFormData.productId,
                productNameAtConfiguration: product.name,
                isActiveForProductInCampaign: pcFormData.isActiveForProductInCampaign,
                lineItemValueRuleJson: pcFormData.lineItemValueRuleJson || Prisma.DbNull,
                lineItemQuantityRuleJson: pcFormData.lineItemQuantityRuleJson || Prisma.DbNull,
                specificQtyThresholdRuleJson: pcFormData.specificQtyThresholdRuleJson || Prisma.DbNull,
                specificUnitPriceThresholdRuleJson: pcFormData.specificUnitPriceThresholdRuleJson || Prisma.DbNull,
            }
        });
      }
      
      const finalDiscountSet = await tx.discountSet.findUniqueOrThrow({
        where: { id: currentDiscountSet.id },
        include: { productConfigurations: { include: { product: true } } },
      });
      return finalDiscountSet;
    });

    return { success: true, data: mapPrismaDiscountSetToType(savedDbSet) };
  } catch (error: any) {
    console.error('Error saving discount set:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && error.meta?.target && Array.isArray(error.meta.target) && error.meta.target.includes('name')) {
      return { success: false, error: 'A discount campaign with this name already exists.' };
    }
    return { success: false, error: `Failed to save discount set. ${error.message}` };
  }
}


export async function deleteDiscountSetAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.discountSet.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting discount set:', error);
    return { success: false, error: 'Failed to delete discount set.' };
  }
}

export async function getTaxRateAction(): Promise<{
  success: boolean;
  data?: { value: number }; 
  error?: string;
}> {
  try {
    const config = await prisma.appConfig.findUnique({
      where: { id: TAX_RATE_CONFIG_KEY },
    });
    if (config && config.value && typeof (config.value as any).rate === 'number') {
      return { success: true, data: { value: (config.value as any).rate } };
    }
    return { success: true, data: { value: 0 } }; 
  } catch (error) {
    console.error('Error fetching tax rate:', error);
    return { success: false, error: 'Failed to fetch tax rate.' };
  }
}

export async function saveTaxRateAction(
  taxRateValue: number,
  userId: string
): Promise<{ success: boolean; data?: { value: number }; error?: string }> {
  if (typeof taxRateValue !== 'number' || taxRateValue < 0 || taxRateValue > 1) {
     return { success: false, error: 'Invalid tax rate value. Must be between 0 and 1 (e.g., 0.05 for 5%).' };
  }

  try {
    const valueToSave = { rate: taxRateValue };
    await prisma.appConfig.upsert({
      where: { id: TAX_RATE_CONFIG_KEY },
      update: { value: valueToSave as Prisma.InputJsonValue, updatedByUserId: userId },
      create: { id: TAX_RATE_CONFIG_KEY, value: valueToSave as Prisma.InputJsonValue, updatedByUserId: userId },
    });
    return { success: true, data: { value: taxRateValue } };
  } catch (error) {
    console.error('Error saving tax rate:', error);
    return { success: false, error: 'Failed to save tax rate.' };
  }
}

export async function toggleDiscountSetActivationAction(
  id: string,
  isActive: boolean,
  userId: string
): Promise<{ success: boolean; data?: DiscountSet; error?: string }> {
  try {
    const updatedSet = await prisma.discountSet.update({
      where: { id },
      data: { isActive, updatedByUserId: userId },
      include: { productConfigurations: { include: { product: true } } }
    });
    return { success: true, data: mapPrismaDiscountSetToType(updatedSet) };
  } catch (error: any) {
    console.error(`Error ${isActive ? 'activating' : 'deactivating'} discount set:`, error);
    return { success: false, error: `Failed to ${isActive ? 'activate' : 'deactivate'} discount set.` };
  }
}

export async function getProductListForDiscountConfigAction(): Promise<{ success: boolean; data?: { id: string; name: string; category?: string | null }[]; error?: string; }> {
    try {
        const products = await prisma.product.findMany({
            where: { isActive: true },
            select: { id: true, name: true, category: true },
            orderBy: { name: 'asc' },
        });
        return { success: true, data: products };
    } catch (error) {
        console.error('Error fetching product list for discount config:', error);
        return { success: false, error: 'Failed to fetch product list.' };
    }
}
