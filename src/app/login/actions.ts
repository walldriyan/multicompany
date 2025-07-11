'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

export type State = {
  errors?: {
    username?: string[];
    password?: string[];
    general?: string[];
  };
  message?: string | null;
};

export async function login(prevState: State, formData: FormData) {
  const validatedFields = loginSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid fields.',
    };
  }

  const { username, password } = validatedFields.data;
  
  const serverUsername = process.env.USERNAME;
  const serverPassword = process.env.PASSWORD;

  if (!serverUsername || !serverPassword) {
    return {
      errors: {
        general: ['Server is not configured for login. Please contact an administrator.'],
      },
      message: 'Configuration error.',
    };
  }

  if (username === serverUsername && password === serverPassword) {
    redirect('/dashboard');
  }

  return {
    errors: {
      general: ['Invalid username or password.'],
    },
    message: 'Login failed.',
  };
}
