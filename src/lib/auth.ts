
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import type { User, Role } from '@/types';
import prisma from './prisma';

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
