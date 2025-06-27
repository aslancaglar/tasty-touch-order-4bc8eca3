
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSecureForm } from "@/hooks/useSecureForm";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, Mail } from "lucide-react";
import DOMPurify from 'dompurify';

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading, isAdmin, adminCheckCompleted } = useAuth();
  const { secureSubmit, isSubmitting, isBlocked } = useSecureForm({
    maxSubmissions: 5,
    windowSize: 60000 // 1 minute
  });
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Redirect authenticated users to their appropriate dashboard
  useEffect(() => {
    console.log("Auth page effect:", { user: !!user, loading, adminCheckCompleted, isAdmin });
    
    // Only redirect if we have a user and admin check is completed
    if (user && adminCheckCompleted && !loading) {
      console.log("Auth page: User is authenticated, redirecting...", { isAdmin });
      const redirectPath = isAdmin ? "/" : "/owner";
      console.log("Redirecting to:", redirectPath);
      navigate(redirectPath, { replace: true });
    }
  }, [user, isAdmin, loading, adminCheckCompleted, navigate]);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) {
      toast({
        title: "Too many attempts",
        description: "Please wait before trying again",
        variant: "destructive"
      });
      return;
    }

    try {
      await secureSubmit(
        { email, password },
        async (sanitizedData) => {
          const sanitizedEmail = DOMPurify.sanitize(sanitizedData.email.trim().toLowerCase());
          
          console.log("Attempting login for:", sanitizedEmail);
          
          const { error } = await supabase.auth.signInWithPassword({
            email: sanitizedEmail,
            password: sanitizedData.password
          });
          
          if (error) {
            console.error("Login error:", error);
            throw error;
          }
          
          console.log("Login successful - auth state will handle redirect");
          
          toast({
            title: "Login successful",
            description: "Welcome back to QimboKiosk!"
          });
        },
        'login'
      );
    } catch (error: any) {
      console.error("Login failed:", error);
      toast({
        title: "Login failed",
        description: error.message || "An error occurred during login",
        variant: "destructive"
      });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Show loading while auth is being processed
  if (loading) {
    console.log("Auth page: Showing loading state");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't show the form if user is already authenticated
  if (user) {
    console.log("Auth page: User authenticated, showing redirect message");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Qimbo Kiosk Admin</CardTitle>
          <CardDescription>
            Login to access your dashboard
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="pl-10" 
                  required 
                  pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                  title="Please enter a valid email address"
                  disabled={isSubmitting || isBlocked}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground" 
                  onClick={togglePasswordVisibility}
                  disabled={isSubmitting || isBlocked}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="pr-10" 
                  required 
                  disabled={isSubmitting || isBlocked}
                />
              </div>
            </div>
            {isBlocked && (
              <div className="text-sm text-red-600 text-center">
                Too many login attempts. Please wait before trying again.
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting || isBlocked}>
              {isSubmitting ? (
                <span className="flex items-center gap-1">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Logging in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Login
                </span>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Auth;
