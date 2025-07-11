'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { login, type State } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, User, Lock } from 'lucide-react';
import { useEffect, useRef } from 'react';

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending} aria-disabled={pending}>
      {pending ? 'Signing in...' : 'Sign In'}
    </Button>
  );
}

export function LoginForm() {
  const initialState: State = { message: null, errors: {} };
  const [state, dispatch] = useFormState(login, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message === 'Login failed.') {
        formRef.current?.reset();
    }
  }, [state]);

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">SecureAccess</CardTitle>
        <CardDescription>
          Enter your username and password to access your account.
        </CardDescription>
      </CardHeader>
      <form action={dispatch} ref={formRef}>
        <CardContent className="grid gap-4">
          {state.errors?.general && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {state.errors.general.join(', ')}
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                name="username"
                placeholder="admin"
                required
                className="pl-8"
              />
            </div>
            {state.errors?.username && (
              <p className="text-sm font-medium text-destructive">
                {state.errors.username.join(', ')}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
             <div className="relative">
              <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                className="pl-8"
                placeholder="••••••••"
              />
            </div>
            {state.errors?.password && (
              <p className="text-sm font-medium text-destructive">
                {state.errors.password.join(', ')}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <LoginButton />
        </CardFooter>
      </form>
    </Card>
  );
}
