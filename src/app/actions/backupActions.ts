
'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

// This action is for COMPANY USERS to backup their specific data as a JSON file.
async function getCompanyIdFromUserId(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true, role: { select: { name: true } } }
    });

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
      roles: await prisma.role.findMany({ where: { users: { some: { companyId } } } }),
      parties: await prisma.party.findMany({ where: { companyId } }),
      products: await prisma.product.findMany({ where: { companyId }, include: { batches: true } }),
      discountSets: await prisma.discountSet.findMany({ where: { companyId }, include: { productConfigurations: true } }),
      saleRecords: await prisma.saleRecord.findMany({ where: { companyId }, include: { paymentInstallments: true } }),
      purchaseBills: await prisma.purchaseBill.findMany({ where: { companyId }, include: { items: true, payments: true } }),
      financialTransactions: await prisma.financialTransaction.findMany({ where: { companyId } }),
      cashRegisterShifts: await prisma.cashRegisterShift.findMany({ where: { companyId } }),
      stockAdjustmentLogs: await prisma.stockAdjustmentLog.findMany({ where: { companyId } }),
    };
    
    const jsonString = JSON.stringify(backupData, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2);

    return { 
        success: true, 
        data: jsonString,
        companyName: companyProfile.name.replace(/\s+/g, '_')
    };

  } catch (error: any) {
    console.error('Error during company data backup:', error);
    return { success: false, error: error.message || 'An unexpected error occurred during backup.' };
  }
}


// This action is for SUPER ADMINS ONLY to backup the entire database file.
export async function backupFullDatabaseAction(
  userId: string
): Promise<{ success: boolean; data?: Buffer; error?: string }> {
    if (!userId) {
        return { success: false, error: "User not authenticated." };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true }
        });

        if (user?.role?.name !== 'Admin') {
            return { success: false, error: "Permission denied. Only Super Admins can perform a full database backup." };
        }

        // IMPORTANT: This path assumes the standard Prisma setup where the DB is in the `prisma` directory.
        const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
        const dbFileBuffer = await fs.readFile(dbPath);

        return { success: true, data: dbFileBuffer };

    } catch (error: any) {
        console.error('Error during full database backup:', error);
        if (error.code === 'ENOENT') {
            return { success: false, error: "Database file not found at the expected location. Cannot perform backup." };
        }
        return { success: false, error: error.message || "An unexpected server error occurred during backup." };
    }
}
