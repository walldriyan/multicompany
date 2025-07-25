
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import type { User, Role } from '@/types';
import prisma from './prisma';
import 'dotenv/config';

interface AuthUser extends Omit<User, 'passwordHash' | 'role'> {
  role?: Role;
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-default-secret-key-that-is-long-enough');

export async function verifyAuth(): Promise<{ user: AuthUser | null }> {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return { user: null };
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub;

    if (!userId) {
      return { user: null };
    }
    
    // --- Root User Check ---
    if (userId === 'root-user' && payload.role === process.env.ROOT_USER_ROLE_NAME) {
        const allPermissions = await prisma.permission.findMany();
        const rootUserSession = {
            id: 'root-user',
            username: process.env.ROOT_USER_USERNAME || 'root',
            role: {
                name: process.env.ROOT_USER_ROLE_NAME || 'SuperAdmin',
                permissions: allPermissions.map(p => ({ permission: p }))
            },
            company: null,
            companyId: null,
            isActive: true,
        };
        // Serialize for Redux compatibility
        const serializableUser = JSON.parse(JSON.stringify(rootUserSession));
        return { user: serializableUser };
    }
    // --- End Root User Check ---


    const userFromDb = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        company: true,
      },
    });

    if (!userFromDb) {
      return { user: null };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = userFromDb;

    // Serialize dates to strings for Redux compatibility
    const serializableUser = JSON.parse(JSON.stringify(userWithoutPassword, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }));


    return { user: serializableUser };
  } catch (error) {
    console.error("Auth verification error:", error);
    return { user: null };
  }
}
