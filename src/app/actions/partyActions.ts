
'use server';

import prisma from '@/lib/prisma';
import { PartyCreateInputSchema, PartyUpdateInputSchema } from '@/lib/zodSchemas';
import type { Party as PartyType, PartyCreateInput, PartyUpdateInput, PartyTypeEnum } from '@/types';
import { Prisma } from '@prisma/client';

// Helper to map Prisma Party to our PartyType
function mapPrismaPartyToType(
  prismaParty: Prisma.PartyGetPayload<{}>,
): PartyType {
  return {
    id: prismaParty.id,
    name: prismaParty.name,
    phone: prismaParty.phone,
    email: prismaParty.email,
    address: prismaParty.address,
    type: prismaParty.type as PartyTypeEnum, // Cast because Prisma enum might be different
    isActive: prismaParty.isActive,
    createdAt: prismaParty.createdAt?.toISOString(),
    updatedAt: prismaParty.updatedAt?.toISOString(),
    // createdByUserId and updatedByUserId are intentionally omitted from the return type for security
  };
}

export async function createPartyAction(
  partyData: unknown,
  userId: string | null
): Promise<{ success: boolean; data?: PartyType; error?: string, fieldErrors?: Record<string, string[]> }> {
  if (!prisma || !prisma.party) {
    return { success: false, error: "Prisma client or Party model not initialized. Please run 'npx prisma generate'." };
  }
  const validationResult = PartyCreateInputSchema.safeParse(partyData);
  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;
    return { success: false, error: "Validation failed. Check field errors.", fieldErrors };
  }
  const validatedData = validationResult.data;

  try {
    const newParty = await prisma.party.create({
      data: {
        ...validatedData,
        phone: validatedData.phone || undefined,
        email: validatedData.email || undefined,
        address: validatedData.address || undefined,
        createdByUserId: userId,
        updatedByUserId: userId,
      },
    });
    return { success: true, data: mapPrismaPartyToType(newParty) };
  } catch (error: any) {
    console.error('Error creating party:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002' && error.meta?.target) {
         const target = error.meta.target as string[];
        if (target.includes('email') && validatedData.email) {
          return { success: false, error: 'A party with this email already exists.' };
        }
         if (target.includes('name') && validatedData.name) { 
          return { success: false, error: 'A party with this name already exists (if name is set to be unique).' };
        }
        return { success: false, error: `A unique constraint violation occurred on: ${target.join(', ')}` };
      }
    }
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create party.' };
  }
}

export async function getAllPartiesAction(): Promise<{
  success: boolean;
  data?: PartyType[];
  error?: string;
}> {
  if (!prisma || !prisma.party) {
    return { success: false, error: "Prisma client or Party model not initialized." };
  }
  try {
    const partiesFromDB = await prisma.party.findMany({
      orderBy: { name: 'asc' },
    });
    const mappedParties: PartyType[] = partiesFromDB.map(mapPrismaPartyToType);
    return { success: true, data: mappedParties };
  } catch (error: any) {
    console.error('Error fetching parties:', error);
    return { success: false, error: 'Failed to fetch parties.' };
  }
}

export async function getAllCustomersAction(): Promise<{
  success: boolean;
  data?: PartyType[];
  error?: string;
}> {
  if (!prisma || !prisma.party) {
    return { success: false, error: "Prisma client or Party model not initialized." };
  }
  try {
    const customersFromDB = await prisma.party.findMany({
      where: { type: 'CUSTOMER', isActive: true },
      orderBy: { name: 'asc' },
    });
    const mappedCustomers: PartyType[] = customersFromDB.map(mapPrismaPartyToType);
    return { success: true, data: mappedCustomers };
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return { success: false, error: 'Failed to fetch customers.' };
  }
}


export async function getPartyByIdAction(
  id: string
): Promise<{ success: boolean; data?: PartyType; error?: string }> {
  if (!prisma || !prisma.party) {
    return { success: false, error: "Prisma client or Party model not initialized." };
  }
  if (!id) return { success: false, error: "Party ID is required." };
  try {
    const party = await prisma.party.findUnique({
      where: { id },
    });
    if (!party) {
      return { success: false, error: 'Party not found.' };
    }
    return { success: true, data: mapPrismaPartyToType(party) };
  } catch (error: any) {
    console.error(`Error fetching party by ID ${id}:`, error);
    return { success: false, error: 'Failed to fetch party.' };
  }
}

export async function updatePartyAction(
  id: string,
  partyData: unknown,
  userId: string | null
): Promise<{ success: boolean; data?: PartyType; error?: string, fieldErrors?: Record<string, string[]> }> {
  if (!prisma || !prisma.party) {
    return { success: false, error: "Prisma client or Party model not initialized." };
  }
  if (!id) return { success: false, error: "Party ID is required for update." };
  
  const validationResult = PartyUpdateInputSchema.safeParse(partyData);
  if (!validationResult.success) {
     const fieldErrors = validationResult.error.flatten().fieldErrors;
    return { success: false, error: "Validation failed. Check field errors.", fieldErrors };
  }
  const validatedData = validationResult.data;

  if (Object.keys(validatedData).length === 0) {
    return { success: false, error: "No data provided for update." };
  }
  
  const dataToUpdate: Prisma.PartyUpdateInput = { 
    ...validatedData,
    updatedByUserId: userId,
  };
  if (validatedData.hasOwnProperty('phone')) dataToUpdate.phone = validatedData.phone === null ? null : validatedData.phone;
  if (validatedData.hasOwnProperty('email')) dataToUpdate.email = validatedData.email === null ? null : validatedData.email;
  if (validatedData.hasOwnProperty('address')) dataToUpdate.address = validatedData.address === null ? null : validatedData.address;

  try {
    const updatedParty = await prisma.party.update({
      where: { id },
      data: dataToUpdate,
    });
    return { success: true, data: mapPrismaPartyToType(updatedParty) };
  } catch (error: any) {
    console.error(`Error updating party for ID ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002' && error.meta?.target) {
         const target = error.meta.target as string[];
        if (target.includes('email') && validatedData.email) {
          return { success: false, error: 'A party with this email already exists.' };
        }
         if (target.includes('name') && validatedData.name) {
          return { success: false, error: 'A party with this name already exists (if name is set to be unique).' };
        }
        return { success: false, error: `A unique constraint violation occurred on: ${target.join(', ')}` };
      }
      if (error.code === 'P2025') return { success: false, error: 'Party to update not found.' };
    }
    return { success: false, error: 'Failed to update party.' };
  }
}

export async function deletePartyAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!prisma || !prisma.party) {
    return { success: false, error: "Prisma client or Party model not initialized." };
  }
  if (!id) return { success: false, error: "Party ID is required for deletion." };
  try {
    await prisma.party.delete({
      where: { id },
    });
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting party for ID ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return { success: false, error: 'Party to delete not found.' };
    }
    return { success: false, error: 'Failed to delete party.' };
  }
}
