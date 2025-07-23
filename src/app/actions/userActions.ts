
'use server';

import prisma from '@/lib/prisma';
import type { UserCreateInput, UserUpdateInput, Role, User, CompanyProfileFormData } from '@/types';
import { UserCreateSchema, UserUpdateSchema } from '@/lib/zodSchemas';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

// Helper to map Prisma User to our User type (excluding passwordHash)
function mapPrismaUserToType(prismaUser: any): Omit<User, 'passwordHash'> {
  return {
    id: prismaUser.id,
    username: prismaUser.username,
    email: prismaUser.email,
    isActive: prismaUser.isActive,
    roleId: prismaUser.roleId,
    companyId: prismaUser.companyId,
    company: prismaUser.company,
    role: prismaUser.role ? {
        id: prismaUser.role.id,
        name: prismaUser.role.name,
        description: prismaUser.role.description,
        // Permissions can be added here if fetched and needed
    } : undefined,
    createdAt: prismaUser.createdAt?.toISOString(),
    updatedAt: prismaUser.updatedAt?.toISOString(),
  };
}


export async function createUserAction(
  userData: unknown,
  actorUserId: string | null
): Promise<{ success: boolean; data?: Omit<User, 'passwordHash'>; error?: string; fieldErrors?: Record<string, string[]> }> {
  const validationResult = UserCreateSchema.safeParse(userData);
  if (!validationResult.success) {
    return { success: false, error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors };
  }
  
  const { password, confirmPassword, ...restOfUserData } = validationResult.data;

  try {
     const role = await prisma.role.findUnique({ where: { id: restOfUserData.roleId } });
     if (!role) {
         return { success: false, error: "Selected role does not exist." };
     }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        ...restOfUserData,
        passwordHash,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      include: { role: true, company: true },
    });
    return { success: true, data: mapPrismaUserToType(newUser) };
  } catch (error: any) {
    console.error('Error creating user:', error); // Detailed log for server console
    let errorMessage = 'Failed to create user. Please check server logs for more details.';
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[] | undefined;
        if (target?.includes('username')) {
          errorMessage = 'Username already exists.';
        } else if (target?.includes('email') && restOfUserData.email) {
          errorMessage = 'Email already exists.';
        } else {
          errorMessage = `A user with this ${target?.join(', ')} already exists.`;
        }
      } else if (error.code === 'P2003') { // Foreign key constraint failed
        if (error.message.includes('User_roleId_fkey')) {
             errorMessage = 'Invalid Role selected. The specified role does not exist.';
        } else if (error.message.includes('User_companyId_fkey')) {
             errorMessage = 'Invalid Company selected. The specified company does not exist.';
        } else {
            errorMessage = `Database integrity error: ${error.message} (Code: ${error.code})`;
        }
      } else {
        errorMessage = `Database error: ${error.message} (Code: ${error.code})`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message; // For other types of errors
    }
    return { success: false, error: errorMessage };
  }
}

export async function getAllUsersWithRolesAction(actorUserId: string | null): Promise<{
  success: boolean;
  data?: Omit<User, 'passwordHash'>[];
  error?: string;
}> {
  if (!actorUserId) {
    return { success: false, error: "User not authenticated." };
  }
  try {
    const actorUser = await prisma.user.findUnique({
        where: { id: actorUserId },
        select: { companyId: true, role: { select: { name: true } } }
    });

    if (!actorUser) {
        return { success: false, error: "Authenticated user not found." };
    }
    
    const isSuperAdmin = actorUser.role?.name === 'Admin' && !actorUser.companyId;
    
    let whereClause: Prisma.UserWhereInput = {};

    if (isSuperAdmin) {
        // Super admin sees all users
        whereClause = {};
    } else if (actorUser.companyId) {
        // Company users see only users from their own company
        whereClause = { companyId: actorUser.companyId };
    } else {
        // A non-admin user without a company sees no one (edge case)
        return { success: true, data: [] };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: { role: true, company: true },
      orderBy: { username: 'asc' },
    });
    return { success: true, data: users.map(mapPrismaUserToType) };
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return { success: false, error: 'Failed to fetch users.' };
  }
}

export async function updateUserAction(
  id: string,
  userData: unknown,
  actorUserId: string | null
): Promise<{ success: boolean; data?: Omit<User, 'passwordHash'>; error?: string; fieldErrors?: Record<string, string[]> }> {
  if (!id) return { success: false, error: "User ID is required for update." };
  
  const validationResult = UserUpdateSchema.safeParse(userData);
  if (!validationResult.success) {
    return { success: false, error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors };
  }
  
  const { password, confirmPassword, ...restOfUserData } = validationResult.data;

  try {
    const role = await prisma.role.findUnique({ where: { id: restOfUserData.roleId } });
    if (!role) {
      return { success: false, error: "Selected role does not exist." };
    }
    
    const dataToUpdate: Prisma.UserUpdateInput = { 
        ...restOfUserData,
        updatedByUserId: actorUserId
    };
    
    if (password && password.trim() !== "") {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      include: { role: true, company: true },
    });
    return { success: true, data: mapPrismaUserToType(updatedUser) };
  } catch (error: any) {
    console.error('[ACTION FAIL] Critical error in updateUserAction:', error);
    let errorMessage = 'Failed to update user. Please check server logs for details.';
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[] | undefined;
        if (target?.includes('username')) {
            errorMessage = 'Username already exists.';
        } else if (target?.includes('email') && restOfUserData.email) {
            errorMessage = 'Email already exists.';
        } else {
            errorMessage = `A user with this ${target?.join(', ')} already exists.`;
        }
      } else if (error.code === 'P2025') {
        errorMessage = 'User to update not found.';
      } else if (error.message.includes('User_roleId_fkey')) {
         errorMessage = 'Invalid Role selected. The specified role does not exist.';
      } else if (error.message.includes('User_companyId_fkey')) {
         errorMessage = 'Invalid Company selected. The specified company does not exist.';
      } else {
        errorMessage = `Database error: ${error.message} (Code: ${error.code})`;
      }
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

export async function deleteUserAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: "User ID is required for deletion." };
  try {
    await prisma.user.delete({
      where: { id },
    });
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting user for ID ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return { success: false, error: 'User to delete not found.' };
    }
    return { success: false, error: 'Failed to delete user. Check server logs for details.' };
  }
}

export async function getRolesForUserFormAction(): Promise<{ success: boolean; data?: Pick<Role, 'id' | 'name'>[]; error?: string }> {
  try {
    const roles = await prisma.role.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: roles };
  } catch (error: any) {
    console.error('Error fetching roles for form:', error);
    return { success: false, error: 'Failed to fetch roles for form.' };
  }
}

export async function getCompaniesForUserFormAction(): Promise<{ success: boolean; data?: Pick<CompanyProfileFormData, 'id' | 'name'>[]; error?: string }> {
  try {
    const companies = await prisma.companyProfile.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: companies };
  } catch (error: any) {
    console.error('Error fetching companies for form:', error);
    return { success: false, error: 'Failed to fetch companies for form.' };
  }
}
