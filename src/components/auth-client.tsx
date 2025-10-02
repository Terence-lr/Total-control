
'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Loader2, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { initiateEmailSignIn, initiateEmailSignUp, initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';


export function AuthClient() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);


  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleAuthAction = async (action: 'login' | 'signup' | 'anonymous') => {
    if (isAuthLoading) return;
    setIsAuthLoading(true);

    try {
        if (action === 'signup') {
            if (!displayName.trim()) {
                toast({ title: "Display name is required", variant: "destructive" });
                setIsAuthLoading(false);
                return;
            }
            // First, create the user
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const firebaseUser = userCredential.user;

            // Then, update their profile and create the Firestore document
            if (firebaseUser) {
                await updateProfile(firebaseUser, { displayName });
                const userDocRef = doc(firestore, 'users', firebaseUser.uid);
                await setDoc(userDocRef, {
                    displayName,
                    email: firebaseUser.email,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            }
            toast({ title: "Signup Successful", description: "Welcome! Redirecting you to the dashboard." });
        } else if (action === 'login') {
            await auth.signInWithEmailAndPassword(email, password);
            toast({ title: "Login Successful", description: "Welcome back!" });
        } else if (action === 'anonymous') {
            await auth.signInAnonymously();
            toast({ title: "Signed in Anonymously", description: "Your data will be temporary." });
        }
    } catch (error: any) {
        console.error(`${action} error:`, error);
        toast({
            title: `Error during ${action}`,
            description: error.message || 'An unexpected error occurred.',
            variant: 'destructive',
        });
    } finally {
        setIsAuthLoading(false);
    }
  };
  
  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <Bot className="mx-auto h-12 w-12" />
          <CardTitle className="text-2xl">Welcome to Total Control</CardTitle>
          <CardDescription>Sign in or create an account to take charge of your day</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="login-email">Email</Label>
                            <Input id="login-email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isAuthLoading} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="login-password">Password</Label>
                            <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isAuthLoading} />
                        </div>
                    </div>
                     <CardFooter className="flex-col px-0 pt-6">
                        <Button className="w-full" onClick={() => handleAuthAction('login')} disabled={isAuthLoading}>
                            {isAuthLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Login
                        </Button>
                     </CardFooter>
                </TabsContent>
                <TabsContent value="signup">
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="signup-name">Display Name</Label>
                            <Input id="signup-name" type="text" placeholder="Jane Doe" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={isAuthLoading} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="signup-email">Email</Label>
                            <Input id="signup-email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isAuthLoading} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="signup-password">Password</Label>
                            <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isAuthLoading} />
                        </div>
                    </div>
                     <CardFooter className="px-0 pt-6">
                        <Button className="w-full" onClick={() => handleAuthAction('signup')} disabled={isAuthLoading}>
                            {isAuthLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Account
                        </Button>
                     </CardFooter>
                </TabsContent>
            </Tabs>

        </CardContent>
         <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
        </div>
         <CardFooter className="flex-col gap-4">
            <Button variant="outline" className="w-full" onClick={() => handleAuthAction('anonymous')} disabled={isAuthLoading}>
                {isAuthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserIcon className="mr-2 h-4 w-4"/>}
                Sign in Anonymously
            </Button>
        </CardFooter>

      </Card>
    </div>
  );
}
