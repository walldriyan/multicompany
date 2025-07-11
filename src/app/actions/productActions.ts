
'use server';

import prisma from '@/lib/prisma';
import { ProductCreateInputSchema, ProductUpdateInputSchema, UnitDefinitionSchema } from '@/lib/zodSchemas';
import type { Product as ProductType, ProductCreateInput, ProductUpdateInput, UnitDefinition, ProductDiscountConfiguration as ProductDiscountConfigurationType } from '@/types';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Helper to map Prisma Product to our ProductType
function mapPrismaProductToType(
  prismaProduct: any,
): ProductType {

  let parsedUnits: UnitDefinition;
  if (prismaProduct.units === null || typeof prismaProduct.units !== 'object' || Array.isArray(prismaProduct.units)) {
      console.warn(`Product ID ${prismaProduct.id} ('${prismaProduct.name}') has missing or invalid units data. Defaulting units.`);
      parsedUnits = { baseUnit: 'pcs', derivedUnits: [] };
  } else {
    try {
      parsedUnits = UnitDefinitionSchema.parse(prismaProduct.units);
    } catch (zodError: any) {
      console.warn(`Product ID ${prismaProduct.id} ('${prismaProduct.name}') Zod error on units. Defaulting. Error: ${zodError.message}. Data: ${JSON.stringify(prismaProduct.units)}`);
      parsedUnits = { baseUnit: 'pcs', derivedUnits: [] };
    }
  }

  return {
    id: prismaProduct.id,
    name: prismaProduct.name,
    code: prismaProduct.code,
    category: prismaProduct.category,
    barcode: prismaProduct.barcode,
    units: parsedUnits,
    sellingPrice: prismaProduct.sellingPrice,
    costPrice: prismaProduct.costPrice,
    stock: prismaProduct.stock,
    defaultQuantity: prismaProduct.defaultQuantity,
    isActive: prismaProduct.isActive,
    isService: prismaProduct.isService,
    productSpecificTaxRate: prismaProduct.productSpecificTaxRate,
    description: prismaProduct.description,
    imageUrl: prismaProduct.imageUrl,
    createdAt: prismaProduct.createdAt?.toISOString(),
    updatedAt: prismaProduct.updatedAt?.toISOString(),
    createdByUserId: prismaProduct.createdByUserId,
    updatedByUserId: prismaProduct.updatedByUserId,
    productDiscountConfigurations: prismaProduct.productDiscountConfigurations?.map((pdc: any) => ({
      ...pdc,
      createdAt: pdc.createdAt instanceof Date ? pdc.createdAt.toISOString() : pdc.createdAt,
      updatedAt: pdc.updatedAt instanceof Date ? pdc.updatedAt.toISOString() : pdc.updatedAt,
    })) as ProductDiscountConfigurationType[] | undefined,
  };
}

export async function createProductAction(
  productData: unknown,
  userId: string | null
): Promise<{ success: boolean; data?: ProductType; error?: string, fieldErrors?: Record<string, string[]> }> {
  if (!prisma || !prisma.product) {
    return { success: false, error: "Prisma client or Product model not initialized. Please run 'npx prisma generate'." };
  }
  const validationResult = ProductCreateInputSchema.safeParse(productData);
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;
    console.log("Validation errors (create product):", fieldErrors);
    return { success: false, error: "Validation failed. Check field errors.", fieldErrors };
  }
  const validatedProductData = validationResult.data;

  const { ...restOfProductData } = validatedProductData;
  const unitsToStore = restOfProductData.units as Prisma.JsonValue;

  try {
    const newProduct = await prisma.product.create({
      data: {
        ...restOfProductData,
        units: unitsToStore,
        code: restOfProductData.code || undefined,
        category: restOfProductData.category || undefined,
        barcode: restOfProductData.barcode || undefined,
        costPrice: restOfProductData.costPrice === null ? undefined : restOfProductData.costPrice,
        productSpecificTaxRate: restOfProductData.productSpecificTaxRate === null ? undefined : restOfProductData.productSpecificTaxRate,
        description: restOfProductData.description || undefined,
        imageUrl: restOfProductData.imageUrl || undefined,
        createdByUserId: userId,
        updatedByUserId: userId,
      },
      include: { productDiscountConfigurations: true }
    });
    return { success: true, data: mapPrismaProductToType(newProduct) };
  } catch (error: any) {
    console.error('Error creating product:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[] | undefined;
        if (target?.includes('name')) return { success: false, error: 'A product with this name already exists.' };
        if (target?.includes('code')) return { success: false, error: 'A product with this code already exists.' };
        return { success: false, error: `A unique constraint violation occurred on: ${target?.join(', ')}` };
      }
    }
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create product.' };
  }
}

export async function getAllProductsAction(): Promise<{
  success: boolean;
  data?: ProductType[];
  error?: string;
  detailedError?: string;
}> {
  if (!prisma) {
    return { success: false, error: "Prisma client is not initialized.", detailedError: "The Prisma instance was not available." };
  }
  if (!prisma.product) {
    return { success: false, error: "Product model accessor is missing.", detailedError: "prisma.product was undefined." };
  }

  try {
    const productsFromDB = await prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: { productDiscountConfigurations: true }
    });

    const mappedProducts: ProductType[] = productsFromDB.map(mapPrismaProductToType);
    return { success: true, data: mappedProducts };

  } catch (error: any) {
    console.error('Error in getAllProductsAction:', error);
    let errorMessage = 'Failed to fetch products.';
    let detailedErrorMessage = String(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) errorMessage = `Database error (Code: ${error.code}).`;
    else if (error instanceof z.ZodError) errorMessage = `Data validation error (Zod).`;
    else if (error instanceof Error) errorMessage = `Unexpected error: ${error.message}.`;
    return { success: false, error: errorMessage, detailedError: detailedErrorMessage };
  }
}


export async function getProductByIdAction(
  id: string
): Promise<{ success: boolean; data?: ProductType; error?: string }> {
  if (!prisma || !prisma.product) return { success: false, error: "Prisma client or Product model not initialized." };
  if (!id) return { success: false, error: "Product ID is required." };
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { productDiscountConfigurations: true }
    });
    if (!product) return { success: false, error: 'Product not found.' };

    return { success: true, data: mapPrismaProductToType(product) };
  } catch (error: any) {
    console.error(`Error in getProductByIdAction for ID ${id}:`, error);
    let errorMessage = 'Failed to fetch product.';
    if (error instanceof z.ZodError) errorMessage = `Product data (units) for ID ${id} is invalid.`;
    else if (error instanceof Error) errorMessage = error.message;
    return { success: false, error: errorMessage };
  }
}

export async function updateProductAction(
  id: string,
  productData: unknown,
  userId: string | null
): Promise<{ success: boolean; data?: ProductType; error?: string, fieldErrors?: Record<string, string[]> }> {
  if (!prisma || !prisma.product) return { success: false, error: "Prisma client or Product model not initialized." };
  if (!id) return { success: false, error: "Product ID is required for update." };

  const validationResult = ProductUpdateInputSchema.safeParse(productData);
  if (!validationResult.success) {
     const fieldErrors = validationResult.error.flatten().fieldErrors;
     console.log("Validation errors (update product):", fieldErrors);
    return { success: false, error: "Validation failed. Check field errors.", fieldErrors };
  }
  const validatedProductData = validationResult.data;

  if (Object.keys(validatedProductData).length === 0) {
    return { success: false, error: "No data provided for update." };
  }

  const { ...restOfProductData } = validatedProductData;

  const dataToUpdate: Prisma.ProductUpdateInput = { 
      ...restOfProductData,
      updatedByUserId: userId,
  };
  if (validatedProductData.units) dataToUpdate.units = validatedProductData.units as Prisma.JsonValue;
  if (validatedProductData.hasOwnProperty('code')) dataToUpdate.code = validatedProductData.code === null ? null : validatedProductData.code;

  try {
    const updatedProduct = await prisma.product.update({
        where: { id },
        data: dataToUpdate,
        include: { productDiscountConfigurations: true }
    });

    return { success: true, data: mapPrismaProductToType(updatedProduct) };
  } catch (error: any) {
    console.error(`Error in updateProductAction for ID ${id}:`, error);
    let errorMessage = 'Failed to update product.';
    if (error instanceof z.ZodError) errorMessage = `Product data is invalid.`;
    else if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') errorMessage = 'A product with this name or code already exists.';
        else if (error.code === 'P2025') errorMessage = 'Product to update not found.';
    } else if (error instanceof Error) errorMessage = error.message;
    return { success: false, error: errorMessage };
  }
}

export async function deleteProductAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!prisma || !prisma.product) return { success: false, error: "Prisma client or Product model not initialized." };
  if (!id) return { success: false, error: "Product ID is required for deletion." };
  try {
    // Prisma cascading delete should handle related ProductDiscountConfiguration records (defined in schema)
    await prisma.product.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error(`Error in deleteProductAction for ID ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return { success: false, error: 'Product to delete not found.' };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      // Check if the foreign key constraint is on ProductDiscountConfiguration
      if (error.message.includes('ProductDiscountConfiguration_productId_fkey')) {
        return { success: false, error: 'Cannot delete product. It is still part of one or more Discount Campaign configurations.' };
      }
      return { success: false, error: 'Cannot delete product. It is referenced in existing sale or purchase records.' };
    }
    return { success: false, error: 'Failed to delete product.' };
  }
}

export async function updateProductStockAction(
  productId: string,
  changeInStock: number,
  userId: string | null,
): Promise<{ success: boolean; data?: ProductType; error?: string }> {
  if (!prisma || !prisma.product) return { success: false, error: "Prisma client or Product model not initialized."};
  if (!productId) return { success: false, error: "Product ID is required." };
  if (typeof changeInStock !== 'number') return { success: false, error: "Invalid change in stock value."};

  try {
    const product = await prisma.product.findUnique({ where: { id: productId }, include: { productDiscountConfigurations: true }});
    if (!product) return { success: false, error: "Product not found for stock update." };

    if (product.isService) {
        return { success: true, data: mapPrismaProductToType(product) };
    }

    const newStock = product.stock + changeInStock;
    if (newStock < 0) {
      return { success: false, error: `Stock for ${product.name} cannot be negative.` };
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { 
          stock: newStock,
          updatedByUserId: userId,
       },
      include: { productDiscountConfigurations: true }
    });
    return { success: true, data: mapPrismaProductToType(updatedProduct) };
  } catch (error: any) {
    console.error(`Error in updateProductStockAction for product ${productId}:`, error);
    let errorMessage = "Failed to update product stock.";
    if (error instanceof z.ZodError) errorMessage = `Product data (units) is invalid.`;
    else if (error instanceof Error) errorMessage = error.message;
    return { success: false, error: errorMessage };
  }
}
