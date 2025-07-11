
'use server';
import prisma from '@/lib/prisma';
import { updateProductStockAction } from '@/app/actions/productActions';
import { StockAdjustmentFormSchema } from '@/lib/zodSchemas';
import type { StockAdjustmentFormData } from '@/types';

export async function adjustStockAction(
  data: Omit<StockAdjustmentFormData, 'userId'>,
  userId: string
): Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> }> {
  
  if (!userId) {
    return { success: false, error: 'User not authenticated. Cannot adjust stock.' };
  }

  const validationResult = StockAdjustmentFormSchema.omit({userId: true}).safeParse(data);
  if (!validationResult.success) {
    return { success: false, error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors };
  }

  const { productId, quantity, reason, notes } = validationResult.data;

  let changeInStock = 0;
  switch (reason) {
    case 'LOST':
    case 'DAMAGED':
    case 'CORRECTION_SUBTRACT':
      changeInStock = -Math.abs(quantity);
      break;
    case 'CORRECTION_ADD':
      changeInStock = Math.abs(quantity);
      break;
    default:
      return { success: false, error: "Invalid adjustment reason." };
  }

  const updateResult = await updateProductStockAction(productId, changeInStock, userId);

  if (!updateResult.success) {
    return { success: false, error: updateResult.error || "Failed to update product stock." };
  }

  try {
    await prisma.stockAdjustmentLog.create({
      data: {
        productId,
        quantityChanged: changeInStock,
        reason,
        notes,
        userId: userId,
        adjustedAt: new Date(),
      }
    });
  } catch (logError) {
    console.error("Failed to log stock adjustment:", logError);
  }

  return { success: true };
}
