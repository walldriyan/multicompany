
'use server';

import prisma from '@/lib/prisma';
import { FinancialTransactionFormSchema } from '@/lib/zodSchemas';
import type { FinancialTransaction, FinancialTransactionFormData } from '@/types';
import { Prisma } from '@prisma/client';

function mapPrismaToTransaction(transaction: any): FinancialTransaction {
  return {
    ...transaction,
    date: transaction.date.toISOString(),
    createdAt: transaction.createdAt?.toISOString(),
    updatedAt: transaction.updatedAt?.toISOString(),
  };
}

export async function createTransactionAction(
  data: FinancialTransactionFormData,
  userId: string
): Promise<{ success: boolean; data?: FinancialTransaction; error?: string, fieldErrors?: Record<string, string[]> }> {
  const validationResult = FinancialTransactionFormSchema.safeParse(data);
  if (!validationResult.success) {
    return { success: false, error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors };
  }

  const validatedData = validationResult.data;
  
  try {
    const newTransaction = await prisma.financialTransaction.create({
      data: {
        ...validatedData,
        userId: userId,
      },
    });
    return { success: true, data: mapPrismaToTransaction(newTransaction) };
  } catch (error: any) {
    console.error("Error creating transaction:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, error: `Database error: ${error.message}` };
    }
    return { success: false, error: "Failed to record transaction. Please check server logs." };
  }
}

export async function getTransactionsAction(userId: string): Promise<{
  success: boolean;
  data?: FinancialTransaction[];
  error?: string;
}> {
  try {
    const transactions = await prisma.financialTransaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    return { success: true, data: transactions.map(mapPrismaToTransaction) };
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return { success: false, error: 'Failed to fetch transactions.' };
  }
}

export async function updateTransactionAction(
  id: string,
  data: FinancialTransactionFormData,
  userId: string
): Promise<{ success: boolean; data?: FinancialTransaction; error?: string; fieldErrors?: Record<string, string[]> }> {
  if (!id) return { success: false, error: "Transaction ID is required for update." };
  
  const validationResult = FinancialTransactionFormSchema.safeParse(data);
  if (!validationResult.success) {
    return { success: false, error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors };
  }

  try {
    // Ensure user can only update their own transaction
    const transaction = await prisma.financialTransaction.findFirst({
        where: { id, userId },
    });
    if (!transaction) {
        return { success: false, error: 'Transaction not found or you do not have permission to edit it.' };
    }

    const updatedTransaction = await prisma.financialTransaction.update({
      where: { id },
      data: validationResult.data,
    });
    return { success: true, data: mapPrismaToTransaction(updatedTransaction) };
  } catch (error: any) {
    console.error(`Error updating transaction ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return { success: false, error: 'Transaction to update not found.' };
    }
    return { success: false, error: 'Failed to update transaction.' };
  }
}

export async function deleteTransactionAction(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: "Transaction ID is required for deletion." };
  try {
    // Ensure user can only delete their own transaction
    const transaction = await prisma.financialTransaction.findFirst({
        where: { id, userId },
    });
    if (!transaction) {
        return { success: false, error: 'Transaction not found or you do not have permission to delete it.' };
    }

    await prisma.financialTransaction.delete({
      where: { id },
    });
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting transaction ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return { success: false, error: 'Transaction to delete not found.' };
    }
    return { success: false, error: 'Failed to delete transaction.' };
  }
}
