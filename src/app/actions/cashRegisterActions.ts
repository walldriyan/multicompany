
'use server';
import prisma from '@/lib/prisma';
import type { CashRegisterShift, CashRegisterShiftFormData, ShiftStatus } from '@/types';
import { CashRegisterShiftFormSchema, ShiftStatusEnumSchema } from '@/lib/zodSchemas';
import { Prisma } from '@prisma/client';

function mapPrismaShiftToType(
  prismaShift: Prisma.CashRegisterShiftGetPayload<{ include: { user: { select: { username: true } } } } >
): CashRegisterShift {
  return {
    id: prismaShift.id,
    openingBalance: prismaShift.openingBalance,
    closingBalance: prismaShift.closingBalance,
    notes: prismaShift.notes,
    startedAt: prismaShift.startedAt.toISOString(),
    closedAt: prismaShift.closedAt?.toISOString(),
    status: prismaShift.status as ShiftStatus,
    userId: prismaShift.userId,
    user: prismaShift.user ? { username: prismaShift.user.username } : undefined,
    createdAt: prismaShift.createdAt.toISOString(),
    updatedAt: prismaShift.updatedAt.toISOString(),
  };
}

export async function getActiveShiftForUserAction(userId: string): Promise<{
  success: boolean;
  data?: CashRegisterShift;
  error?: string;
}> {
  if (!userId) return { success: false, error: "User not authenticated." };
  try {
    const activeShift = await prisma.cashRegisterShift.findFirst({
      where: {
        userId: userId,
        status: ShiftStatusEnumSchema.Enum.OPEN,
      },
       include: { user: { select: { username: true } } },
    });
    if (!activeShift) return { success: true, data: undefined };
    return { success: true, data: mapPrismaShiftToType(activeShift) };
  } catch (error: any) {
    console.error("Error fetching active shift:", error);
    return { success: false, error: "Failed to fetch active shift." };
  }
}

export async function startShiftAction(data: CashRegisterShiftFormData, userId: string): Promise<{
  success: boolean;
  data?: CashRegisterShift;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}> {
  if (!userId) return { success: false, error: "User not authenticated." };
  
  const validation = CashRegisterShiftFormSchema.safeParse(data);
  if (!validation.success || validation.data.openingBalance === undefined) {
    return { success: false, error: "Validation failed.", fieldErrors: validation.error?.flatten().fieldErrors };
  }
  
  const { openingBalance, notes } = validation.data;

  try {
    const existingOpenShift = await prisma.cashRegisterShift.findFirst({
      where: { userId, status: 'OPEN' }
    });
    if (existingOpenShift) {
      return { success: false, error: 'An open shift already exists for this user. Please close it first.' };
    }

    const newShift = await prisma.cashRegisterShift.create({
      data: {
        userId,
        openingBalance: openingBalance,
        notes,
        status: 'OPEN',
      },
      include: { user: { select: { username: true } } },
    });

    return { success: true, data: mapPrismaShiftToType(newShift) };
  } catch (error: any) {
    console.error("Error starting shift:", error);
    return { success: false, error: "Failed to start a new shift." };
  }
}

export async function closeShiftAction(data: CashRegisterShiftFormData, shiftId: string, userId: string): Promise<{
  success: boolean;
  data?: CashRegisterShift;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}> {
    if (!userId || !shiftId) return { success: false, error: "User or Shift ID missing." };
    
    const validation = CashRegisterShiftFormSchema.safeParse(data);
     if (!validation.success || validation.data.closingBalance === undefined) {
        return { success: false, error: "Validation failed. Closing balance is required.", fieldErrors: validation.error?.flatten().fieldErrors };
    }
    const { closingBalance, notes } = validation.data;
    
    try {
        const shiftToClose = await prisma.cashRegisterShift.findFirst({
            where: { id: shiftId, userId, status: 'OPEN' }
        });
        if (!shiftToClose) {
            return { success: false, error: "No open shift found to close with the provided ID." };
        }
        
        const updatedShift = await prisma.cashRegisterShift.update({
            where: { id: shiftId },
            data: {
                closingBalance: closingBalance,
                notes: notes, // Update notes if provided
                status: 'CLOSED',
                closedAt: new Date(),
            },
            include: { user: { select: { username: true } } },
        });

        return { success: true, data: mapPrismaShiftToType(updatedShift) };
    } catch (error: any) {
        console.error("Error closing shift:", error);
        return { success: false, error: "Failed to close the shift." };
    }
}

export async function getShiftHistoryAction(page: number = 1, limit: number = 10): Promise<{
  success: boolean;
  data?: { shifts: CashRegisterShift[]; totalCount: number };
  error?: string;
}> {
  try {
    const skip = (page - 1) * limit;
    const [shifts, totalCount] = await prisma.$transaction([
      prisma.cashRegisterShift.findMany({
        include: { user: { select: { username: true } } },
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: skip,
      }),
      prisma.cashRegisterShift.count({}),
    ]);
    
    return { success: true, data: { shifts: shifts.map(mapPrismaShiftToType), totalCount } };
  } catch (error: any) {
    console.error("Error fetching shift history:", error);
    return { success: false, error: "Failed to fetch shift history." };
  }
}

// New action to get a summary of sales for an active shift
export async function getShiftSummaryAction(shiftId: string, userId: string): Promise<{
  success: boolean;
  data?: { totalSales: number; cashSales: number; cardSales: number };
  error?: string;
}> {
  if (!shiftId || !userId) return { success: false, error: "Shift or User ID missing." };
  try {
    const shift = await prisma.cashRegisterShift.findFirst({
      where: { id: shiftId, userId: userId, status: 'OPEN' },
    });
    if (!shift) return { success: false, error: "Active shift not found." };

    const sales = await prisma.saleRecord.findMany({
      where: {
        createdByUserId: userId,
        createdAt: { gte: shift.startedAt },
        recordType: 'SALE'
      },
    });

    let totalSales = 0;
    let cashSales = 0;
    let cardSales = 0;

    sales.forEach(sale => {
      totalSales += sale.totalAmount;
      if (sale.paymentMethod === 'cash') {
        cashSales += sale.totalAmount;
      } else if (sale.paymentMethod === 'credit') {
        cardSales += sale.totalAmount;
      }
    });

    return { success: true, data: { totalSales, cashSales, cardSales } };
  } catch (error) {
    console.error("Error getting shift summary:", error);
    return { success: false, error: "Failed to get shift summary." };
  }
}

// New action to update a closed shift's details
export async function updateClosedShiftAction(shiftId: string, data: { closingBalance: number; notes: string | null }, userId: string): Promise<{
  success: boolean;
  data?: CashRegisterShift;
  error?: string;
}> {
  if (!shiftId || !userId) return { success: false, error: "Shift or User ID missing." };
  try {
    const shift = await prisma.cashRegisterShift.findFirst({
      where: { id: shiftId, userId: userId, status: 'CLOSED' },
    });
    if (!shift) return { success: false, error: "Closed shift not found for this user." };

    const updatedShift = await prisma.cashRegisterShift.update({
      where: { id: shiftId },
      data: {
        closingBalance: data.closingBalance,
        notes: data.notes,
      },
      include: { user: { select: { username: true } } },
    });
    return { success: true, data: mapPrismaShiftToType(updatedShift) };
  } catch (error) {
    console.error("Error updating closed shift:", error);
    return { success: false, error: "Failed to update shift." };
  }
}

// New action to delete a shift
export async function deleteShiftAction(shiftId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  if (!shiftId || !userId) return { success: false, error: "Shift or User ID missing." };
  try {
    const shift = await prisma.cashRegisterShift.findFirst({
      where: { id: shiftId, userId: userId },
    });
    if (!shift) return { success: false, error: "Shift not found for this user." };

    await prisma.cashRegisterShift.delete({
      where: { id: shiftId },
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting shift:", error);
    return { success: false, error: "Failed to delete shift." };
  }
}


export async function getOpeningBalanceSuggestionAction(): Promise<{
  success: boolean;
  data?: number;
  error?: string;
}> {
  try {
    const lastClosedShift = await prisma.cashRegisterShift.findFirst({
      where: {
        status: 'CLOSED',
        closingBalance: { not: null },
      },
      orderBy: {
        closedAt: 'desc',
      },
    });

    return { success: true, data: lastClosedShift?.closingBalance ?? 0 };
  } catch (error: any) {
    console.error("Error fetching last closing balance:", error);
    return { success: false, error: "Failed to fetch opening balance suggestion." };
  }
}
