
'use server';

import prisma from '@/lib/prisma';
import { PurchaseBillCreateInputSchema, PurchaseBillStatusEnumSchema, PurchasePaymentMethodEnumSchema, PurchasePaymentCreateInputSchema } from '@/lib/zodSchemas';
import type { PurchaseBill, PurchaseBillCreateInput, Party, PurchasePayment, PurchaseBillStatusEnum } from '@/types';
import { Prisma } from '@prisma/client';

// Helper to map Prisma PurchaseBill to our PurchaseBillType
function mapPrismaPurchaseBillToType(
  prismaPurchaseBill: Prisma.PurchaseBillGetPayload<{ include: { supplier: true, items: true, payments: true } }>
): PurchaseBill {
  return {
    ...prismaPurchaseBill,
    purchaseDate: prismaPurchaseBill.purchaseDate.toISOString(),
    createdAt: prismaPurchaseBill.createdAt?.toISOString(),
    updatedAt: prismaPurchaseBill.updatedAt?.toISOString(),
    items: prismaPurchaseBill.items.map((item: any) => ({
        ...item,
    })),
    payments: prismaPurchaseBill.payments?.map((p:any) => ({
      ...p,
      paymentDate: p.paymentDate.toISOString(),
      createdAt: p.createdAt.toISOString(),
    })) || [],
    paymentStatus: prismaPurchaseBill.paymentStatus as PurchaseBillStatusEnum,
  };
}


export async function createPurchaseBillAction(
  purchaseData: unknown,
  userId: string
): Promise<{ success: boolean; data?: PurchaseBill; error?: string; fieldErrors?: Record<string, string[]> }> {
  const actionExecutionTime = new Date().toISOString();
  console.log(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Action invoked.`);

  if (!prisma) {
    console.error(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] CRITICAL: prisma instance is NULL or UNDEFINED.`);
    return { success: false, error: "Prisma client is not available at all. This is a severe server misconfiguration." };
  }

  const requiredModels = ['purchaseBill', 'product', 'party', 'purchaseBillItem', 'purchasePayment'];
  let missingModels = [];
  for (const model of requiredModels) {
    if (!(prisma as any)[model]) {
      missingModels.push(model);
    }
  }

  if (missingModels.length > 0) {
    const errorMessage = `Prisma client or required models (${missingModels.join(', ')}) not initialized. Please run 'npx prisma generate' and restart your server.`;
    console.error(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Error:`, errorMessage);
    return { success: false, error: errorMessage };
  }
  console.log(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] All required Prisma models seem to be accessible on the prisma object.`);

  const validationResult = PurchaseBillCreateInputSchema.safeParse(purchaseData);
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;
    console.log(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Purchase Bill Validation errors:`, fieldErrors);
    return { success: false, error: "Validation failed for purchase bill.", fieldErrors };
  }
  const validatedData = validationResult.data;
  console.log(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Validation successful. Data:`, JSON.stringify(validatedData));

  try {
    const totalAmount = validatedData.items.reduce((sum, item) => {
      return sum + (item.quantityPurchased * item.costPriceAtPurchase);
    }, 0);
    console.log(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Calculated totalAmount: ${totalAmount}`);

    const amountActuallyPaid = validatedData.amountPaid ?? 0;
    let finalPaymentStatus: PurchaseBillStatusEnum;

    if (totalAmount === 0) {
      finalPaymentStatus = PurchaseBillStatusEnumSchema.Enum.DRAFT;
    } else if (amountActuallyPaid >= totalAmount) {
        finalPaymentStatus = PurchaseBillStatusEnumSchema.Enum.PAID;
    } else if (amountActuallyPaid > 0 && amountActuallyPaid < totalAmount) {
        finalPaymentStatus = PurchaseBillStatusEnumSchema.Enum.PARTIALLY_PAID;
    } else {
        finalPaymentStatus = PurchaseBillStatusEnumSchema.Enum.COMPLETED;
    }
    console.log(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Determined paymentStatus: ${finalPaymentStatus}`);


    const newPurchaseBill = await prisma.$transaction(async (tx) => {
      console.log(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Starting transaction.`);

      const createdBill = await tx.purchaseBill.create({
        data: {
          supplierId: validatedData.supplierId!,
          supplierBillNumber: validatedData.supplierBillNumber,
          purchaseDate: new Date(validatedData.purchaseDate),
          notes: validatedData.notes,
          totalAmount: totalAmount,
          amountPaid: amountActuallyPaid,
          paymentStatus: finalPaymentStatus,
          createdByUserId: userId,
          items: {
            create: validatedData.items.map((item) => ({
              productId: item.productId,
              productNameAtPurchase: '', // Will be updated below
              quantityPurchased: item.quantityPurchased,
              costPriceAtPurchase: item.costPriceAtPurchase,
              subtotal: item.quantityPurchased * item.costPriceAtPurchase,
            })),
          },
        },
        include: { items: true, supplier: true, payments: true },
      });
      console.log(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] PurchaseBill header created with ID: ${createdBill.id}, AmountPaid: ${createdBill.amountPaid}, Status: ${createdBill.paymentStatus}`);

      if (amountActuallyPaid > 0 && validatedData.initialPaymentMethod) {
        await tx.purchasePayment.create({
            data: {
                purchaseBillId: createdBill.id,
                paymentDate: new Date(validatedData.purchaseDate),
                amountPaid: amountActuallyPaid,
                method: validatedData.initialPaymentMethod,
                reference: validatedData.paymentReference,
                notes: validatedData.paymentNotes,
                recordedByUserId: userId,
            }
        });
        console.log(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Initial payment of ${amountActuallyPaid} via ${validatedData.initialPaymentMethod} recorded for Bill ID ${createdBill.id}.`);
      }

      for (const itemInput of validatedData.items) {
        console.log(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Processing item: ProductID ${itemInput.productId}`);
        const product = await tx.product.findUnique({ where: { id: itemInput.productId } });
        if (!product) {
          console.error(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Product with ID ${itemInput.productId} not found.`);
          throw new Error(`Product with ID ${itemInput.productId} not found during purchase.`);
        }
        console.log(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Found product: ${product.name}`);

        await tx.purchaseBillItem.updateMany({
            where: { purchaseBillId: createdBill.id, productId: itemInput.productId },
            data: { productNameAtPurchase: product.name },
        });
        console.log(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Updated productNameAtPurchase for ${product.name}`);

        if (product.isService) {
            console.log(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Product ${product.name} is a service. Skipping stock/cost update.`);
            continue;
        }

        const newStock = product.stock + itemInput.quantityPurchased;
        await tx.product.update({
          where: { id: itemInput.productId },
          data: {
            stock: newStock,
            costPrice: itemInput.costPriceAtPurchase,
            updatedByUserId: userId,
          },
        });
        console.log(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Updated stock for ${product.name} to ${newStock} and cost price to ${itemInput.costPriceAtPurchase}`);
      }

      const finalBill = await tx.purchaseBill.findUnique({
          where: { id: createdBill.id },
          include: {
              items: { include: { product: {select: { name: true}}}},
              supplier: true,
              payments: true,
          }
      });
       if (!finalBill) {
           console.error(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Failed to refetch the created purchase bill.`);
           throw new Error("Failed to refetch the created purchase bill.");
       }
      console.log(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Transaction completed successfully.`);
      return finalBill;
    });

    console.log(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Purchase bill creation successful. Mapped data being returned.`);
    return { success: true, data: mapPrismaPurchaseBillToType(newPurchaseBill) };
  } catch (error: any) {
    console.error(`@@@ [Action: createPurchaseBillAction - ${actionExecutionTime}] Error creating purchase bill:`, error);
    let errorMessage = 'Failed to create purchase bill.';
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        errorMessage = `Database error: ${error.message} (Code: ${error.code})`;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}


export async function getAllSuppliersAction(): Promise<{ success: boolean; data?: Party[]; error?: string }> {
  const actionExecutionTime = new Date().toISOString();
  console.log(`@@@ [Action: getAllSuppliersAction - ${actionExecutionTime}] Action invoked.`);

  if (!prisma) {
    console.error(`@@@ [Action: getAllSuppliersAction - ${actionExecutionTime}] CRITICAL: prisma instance is NULL or UNDEFINED.`);
    return { success: false, error: "Prisma client is not available at all. This is a severe server misconfiguration." };
  }

  if (!prisma.party) {
    const errorMessage = "Prisma client or Party model not initialized. Please run 'npx prisma generate' and restart your server.";
    console.error(`@@@ [Action: getAllSuppliersAction - ${actionExecutionTime}] Error:`, errorMessage);
    return { success: false, error: errorMessage };
  }
   console.log(`@@@ [Action: getAllSuppliersAction - ${actionExecutionTime}] Prisma and Party model seem accessible.`);
  try {
    const suppliers = await prisma.party.findMany({
      where: { type: 'SUPPLIER', isActive: true },
      orderBy: { name: 'asc' },
    });
    console.log(`@@@ [Action: getAllSuppliersAction - ${actionExecutionTime}] Fetched ${suppliers.length} suppliers.`);
    return { success: true, data: suppliers as Party[] };
  } catch (error: any) {
    console.error(`@@@ [Action: getAllSuppliersAction - ${actionExecutionTime}] Error fetching suppliers:`, error);
    return { success: false, error: 'Failed to fetch suppliers.' };
  }
}

export async function getUnpaidOrPartiallyPaidPurchaseBillsAction(
  limit: number = 50,
  filters?: {
    supplierId?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
  }
): Promise<{ success: boolean; data?: PurchaseBill[]; error?: string }> {
  if (!prisma || !prisma.purchaseBill) {
    return { success: false, error: "Prisma client or PurchaseBill model not initialized." };
  }
  try {
    const whereClause: Prisma.PurchaseBillWhereInput = {
      paymentStatus: {
        in: [PurchaseBillStatusEnumSchema.Enum.COMPLETED, PurchaseBillStatusEnumSchema.Enum.PARTIALLY_PAID],
      },
    };

    if (filters?.supplierId && filters.supplierId !== 'all') {
      whereClause.supplierId = filters.supplierId;
    }

    const dateFilter: Prisma.DateTimeFilter = {};
    if (filters?.startDate) {
      dateFilter.gte = filters.startDate;
    }
    if (filters?.endDate) {
      dateFilter.lte = filters.endDate;
    }
    if (Object.keys(dateFilter).length > 0) {
      whereClause.purchaseDate = dateFilter;
    }

    const unpaidBills = await prisma.purchaseBill.findMany({
      where: whereClause,
      include: { supplier: true, items: true, payments: true },
      orderBy: { purchaseDate: 'asc' },
      take: limit,
    });
    return { success: true, data: unpaidBills.map(mapPrismaPurchaseBillToType) };
  } catch (error: any) {
    console.error('Error fetching unpaid purchase bills:', error);
    return { success: false, error: 'Failed to fetch unpaid purchase bills.' };
  }
}

export async function recordPurchasePaymentAction(
  paymentData: unknown,
  userId: string
): Promise<{ success: boolean; data?: PurchaseBill; error?: string; fieldErrors?: Record<string, string[]> }> {
  if (!prisma || !prisma.purchaseBill || !prisma.purchasePayment) {
    return { success: false, error: "Prisma client or required models not initialized." };
  }
  
  if (!userId) {
    return { success: false, error: 'User is not authenticated. Cannot record payment.' };
  }

  const validationResult = PurchasePaymentCreateInputSchema.safeParse(paymentData);
  if (!validationResult.success) {
    return { success: false, error: "Invalid payment data.", fieldErrors: validationResult.error.flatten().fieldErrors };
  }
  const { purchaseBillId, amountPaid, ...restOfPaymentData } = validationResult.data;

  try {
    const updatedPurchaseBill = await prisma.$transaction(async (tx) => {
      const bill = await tx.purchaseBill.findUnique({
        where: { id: purchaseBillId },
        include: { payments: true }
      });

      if (!bill) {
        throw new Error("Purchase bill not found.");
      }
      if (bill.paymentStatus === PurchaseBillStatusEnumSchema.Enum.PAID) {
        throw new Error("This purchase bill is already fully paid.");
      }

      const currentTotalPaid = bill.payments.reduce((sum, p) => sum + p.amountPaid, 0);
      const totalPaidAfterThisPayment = currentTotalPaid + amountPaid;

      if (totalPaidAfterThisPayment > bill.totalAmount + 0.001) {
        throw new Error(`Payment amount (Rs. ${amountPaid.toFixed(2)}) would result in overpayment. Outstanding: Rs. ${(bill.totalAmount - currentTotalPaid).toFixed(2)}.`);
      }

      await tx.purchasePayment.create({
        data: {
          purchaseBillId: purchaseBillId,
          amountPaid: amountPaid,
          ...restOfPaymentData,
          recordedByUserId: userId,
        },
      });

      const newPaymentStatus = totalPaidAfterThisPayment >= bill.totalAmount - 0.001 ?
                               PurchaseBillStatusEnumSchema.Enum.PAID :
                               PurchaseBillStatusEnumSchema.Enum.PARTIALLY_PAID;

      return tx.purchaseBill.update({
        where: { id: purchaseBillId },
        data: {
          amountPaid: totalPaidAfterThisPayment,
          paymentStatus: newPaymentStatus,
        },
        include: { supplier: true, items: true, payments: true },
      });
    });

    return { success: true, data: mapPrismaPurchaseBillToType(updatedPurchaseBill) };
  } catch (error: any) {
    console.error('Error recording purchase payment:', error);
    return { success: false, error: error.message || 'Failed to record purchase payment.' };
  }
}

export async function getPaymentsForPurchaseBillAction(
  purchaseBillId: string
): Promise<{ success: boolean; data?: PurchasePayment[]; error?: string }> {
  if (!prisma || !prisma.purchasePayment) {
    return { success: false, error: "Prisma client or PurchasePayment model not initialized." };
  }
  if (!purchaseBillId) {
    return { success: false, error: "Purchase Bill ID is required." };
  }
  try {
    const payments = await prisma.purchasePayment.findMany({
      where: { purchaseBillId: purchaseBillId },
      orderBy: { paymentDate: 'asc' },
    });
    const mappedPayments: PurchasePayment[] = payments.map(p => ({
      ...p,
      paymentDate: p.paymentDate.toISOString(),
      createdAt: p.createdAt.toISOString(),
    }));
    return { success: true, data: mappedPayments };
  } catch (error: any) {
    console.error(`Error fetching payments for purchase bill ${purchaseBillId}:`, error);
    return { success: false, error: 'Failed to fetch payments for purchase bill.' };
  }
}
