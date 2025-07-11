import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LogOut } from 'lucide-react';

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Dashboard</CardTitle>
          <CardDescription>Welcome to your secure area.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-lg">You have successfully logged in!</p>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button asChild>
            <Link href="/login">
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
