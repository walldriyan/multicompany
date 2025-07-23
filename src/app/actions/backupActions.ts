
'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

async function getCompanyIdFromUserId(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true, role: { select: { name: true } } }
    });

    // For this action, a company MUST be present. Super Admins cannot backup a specific company.
    if (!user?.companyId) {
        throw new Error("User is not associated with a company. Cannot perform company-specific backup.");
    }
    return user.companyId;
}


export async function backupCompanyDataAction(
  userId: string
): Promise<{ success: boolean; data?: string; error?: string, companyName?: string }> {
  if (!userId) {
    return { success: false, error: "User not authenticated." };
  }

  try {
    const companyId = await getCompanyIdFromUserId(userId);

    const companyProfile = await prisma.companyProfile.findUnique({ where: { id: companyId } });
    
    if (!companyProfile) {
        return { success: false, error: "Company profile not found." };
    }

    const backupData = {
      companyProfile,
      users: await prisma.user.findMany({ where: { companyId } }),
      roles: await prisma.role.findMany({ where: { users: { some: { companyId } } } }), // Roles used by users in this company
      parties: await prisma.party.findMany({ where: { companyId } }),
      products: await prisma.product.findMany({ where: { companyId }, include: { batches: true } }),
      discountSets: await prisma.discountSet.findMany({ where: { companyId }, include: { productConfigurations: true } }),
      saleRecords: await prisma.saleRecord.findMany({ where: { companyId }, include: { paymentInstallments: true } }),
      purchaseBills: await prisma.purchaseBill.findMany({ where: { companyId }, include: { items: true, payments: true } }),
      financialTransactions: await prisma.financialTransaction.findMany({ where: { companyId } }),
      cashRegisterShifts: await prisma.cashRegisterShift.findMany({ where: { companyId } }),
      stockAdjustmentLogs: await prisma.stockAdjustmentLog.findMany({ where: { companyId } }),
      // Note: AppConfig (like tax) is global and not included in company-specific backup.
    };
    
    // Using a replacer to handle BigInt if it ever appears, and formatting for readability
    const jsonString = JSON.stringify(backupData, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2);

    return { 
        success: true, 
        data: jsonString,
        companyName: companyProfile.name.replace(/\s+/g, '_') // Sanitize name for filename
    };

  } catch (error: any) {
    console.error('Error during company data backup:', error);
    return { success: false, error: error.message || 'An unexpected error occurred during backup.' };
  }
}
