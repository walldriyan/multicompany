
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, setAuthLoading, setAuthError, selectCurrentUser, selectAuthStatus, clearUser } from '@/store/slices/authSlice';
import type { AppDispatch } from '@/store/store';
import { loginAction } from '@/app/actions/authActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const dispatch: AppDispatch = useDispatch();
  const { toast } = useToast();
  
  // This effect runs once when the component mounts on the client.
  // It dispatches the action to clear any previous user state from Redux, 
  // ensuring a completely fresh login attempt every time the login page is visited.
  useEffect(() => {
    dispatch(clearUser());
  }, [dispatch]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      username: 'admin',
      password: 'admin',
    },
  });

  const [error, setError] = useState<string | null>(null);
  const authStatus = useSelector(selectAuthStatus);

  const onSubmit = async (data: any) => {
    setError(null);
    dispatch(setAuthLoading());

    try {
        const result = await loginAction(data);

        if (result.success && result.user) {
          dispatch(setUser(result.user));
          toast({ title: 'Login Successful', description: `Welcome, ${result.user.username}!` });
          // On successful state update, redirect to the main page.
          router.push('/');
        } else {
          const errorMessage = result.error || 'An unknown error occurred.';
          setError(errorMessage);
          dispatch(setAuthError(errorMessage));
          toast({ title: 'Login Failed', description: errorMessage, variant: 'destructive' });
        }
    } catch (e: any) {
        const errorMessage = e.message || "A critical error occurred during login.";
        setError(errorMessage);
        dispatch(setAuthError(errorMessage));
        toast({ title: 'Login Failed', description: errorMessage, variant: 'destructive' });
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm mx-auto bg-card border-border shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary flex items-center justify-center">
            <LogIn className="mr-3 h-7 w-7" />
            POS Login
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Please enter your credentials to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/30">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                {...register('username', { required: 'Username is required' })}
                className="bg-input border-border focus:ring-primary"
                disabled={authStatus === 'loading'}
              />
              {errors.username && <p className="text-xs text-destructive mt-1">{errors.username.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...register('password', { required: 'Password is required' })}
                className="bg-input border-border focus:ring-primary"
                disabled={authStatus === 'loading'}
              />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={authStatus === 'loading'}>
              {authStatus === 'loading' ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
