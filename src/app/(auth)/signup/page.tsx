
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Loader2, UserPlus, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isFirebaseConfigured } from '@/lib/firebase-config';
import { lightweightSignup } from '@/lib/lightweight-auth';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
        toast({ title: 'Invalid Password', description: 'Password must be at least 6 characters long.', variant: 'destructive' });
        return;
    }

    setIsLoading(true);

    try {
        const result = await lightweightSignup(email, password);
        if (result.success) {
            toast({ title: 'Account Created', description: "Welcome! Your new workspace is ready. Please log in." });
            router.push('/login');
        } else {
            toast({
                title: 'Sign Up Failed',
                description: result.error || 'Could not create your account. Please try again.',
                variant: 'destructive',
            });
        }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: 'Sign Up Failed',
        description: error.message || 'Could not create your account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src="/logo.png" 
              alt="OmniFlow Logo" 
              className="h-16 w-16"
            />
          </div>
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>Get started with OmniFlow by creating your account.</CardDescription>
        </CardHeader>
        
        <CardContent>
            {!isFirebaseConfigured && (
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Firebase Not Configured</AlertTitle>
                    <AlertDescription>
                        Account creation is disabled. Please add your Firebase config to your .env file.
                    </AlertDescription>
                </Alert>
            )}
        </CardContent>

        <form onSubmit={handleSignUp}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
               <p className="text-xs text-muted-foreground">Password must be at least 6 characters long.</p>
            </div>
             <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading || !isFirebaseConfigured}>
               {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Sign Up
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
             <p className="text-center text-sm text-muted-foreground">
              <Link href="/pricing" className="font-semibold text-primary underline-offset-4 hover:underline">
                View Plans & Features
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
