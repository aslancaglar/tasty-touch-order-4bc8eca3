
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  // Enhanced input validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6 && password.length <= 128;
  };

  // Redirect authenticated users to their appropriate dashboard
  useEffect(() => {
    console.log("Auth page effect:", { user: !!user, loading, adminCheckCompleted, isAdmin });
    
    // Only redirect if we have a user AND admin check is completed
    if (user && adminCheckCompleted && !loading) {
      console.log("Auth page: User is authenticated and admin check complete, redirecting...", { isAdmin });
      const redirectPath = isAdmin ? "/" : "/owner";
      console.log("Redirecting to:", redirectPath);
      navigate(redirectPath, { replace: true });
    }
  }, [user, isAdmin, loading, adminCheckCompleted, navigate]);

  // Enhanced rate limiting check
  const checkRateLimit = async (userId: string | null = null): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_user_id: userId,
        p_action_type: 'login_attempt',
        p_max_attempts: 5,
        p_window_minutes: 15
      });

      if (error) {
        console.error("Rate limit check failed:", error);
        return true; // Allow on error to prevent lockout
      }

      return data === true;
    } catch (error) {
      console.error("Rate limit exception:", error);
      return true; // Allow on error to prevent lockout
    }
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced input validation
    const sanitizedEmail = DOMPurify.sanitize(email.trim().toLowerCase());
    
    if (!validateEmail(sanitizedEmail)) {
      toast({
        title: "Invalid email format",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    if (!validatePassword(password)) {
      toast({
        title: "Invalid password",
        description: "Password must be between 6 and 128 characters",
        variant: "destructive"
      });
      return;
    }

    // Check rate limiting before attempting login
    const canAttempt = await checkRateLimit();
    if (!canAttempt) {
      setIsBlocked(true);
      toast({
        title: "Too many login attempts",
        description: "Please wait 15 minutes before trying again",
        variant: "destructive"
      });
      return;
    }

    setLoginLoading(true);
    
    try {
      console.log("Attempting login for:", sanitizedEmail);
      
      // Log login attempt
      await supabase.rpc('log_security_event', {
        event_type: 'login_attempt',
        event_data: { 
          email: sanitizedEmail,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent
        }
      });
      
      const { error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: password
      });
      
      if (error) {
        console.error("Login error:", error);
        setLoginAttempts(prev => prev + 1);
        
        // Log failed login attempt
        await supabase.rpc('log_security_event', {
          event_type: 'login_failed',
          event_data: { 
            email: sanitizedEmail,
            error: error.message,
            attempts: loginAttempts + 1
          }
        });
        
        throw error;
      }
      
      console.log("Login successful - auth state will handle redirect");
      
      toast({
        title: "Login successful",
        description: "Welcome back to QimboKiosk!"
      });
      
      // Reset attempts on successful login
      setLoginAttempts(0);
      setIsBlocked(false);
      
    } catch (error: any) {
      console.error("Login failed:", error);
      
      // Enhanced error messages based on error type
      let errorMessage = "An error occurred during login";
      
      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Please verify your email address first";
      } else if (error.message?.includes("Too many requests")) {
        errorMessage = "Too many login attempts. Please try again later";
        setIsBlocked(true);
      }
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      setLoginLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Show loading while auth is being processed OR while admin check is incomplete
  if (loading || (user && !adminCheckCompleted)) {
    console.log("Auth page: Showing loading state", { loading, user: !!user, adminCheckCompleted });
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {loading 
              ? "Checking authentication..." 
              : "Verifying permissions..."
            }
          </p>
        </div>
      </div>
    );
  }

  // Don't show the form if user is already authenticated and admin check is complete
  if (user && adminCheckCompleted) {
    console.log("Auth page: User authenticated and admin check complete, showing redirect message");
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
                  maxLength={255}
                  pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                  title="Please enter a valid email address"
                  disabled={loginLoading || isBlocked}
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
                  disabled={loginLoading || isBlocked}
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
                  minLength={6}
                  maxLength={128}
                  disabled={loginLoading || isBlocked}
                />
              </div>
            </div>
            {isBlocked && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                Too many failed attempts. Please wait 15 minutes before trying again.
              </div>
            )}
            {loginAttempts > 2 && !isBlocked && (
              <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-md">
                Warning: {5 - loginAttempts} attempts remaining before temporary lockout.
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginLoading || isBlocked}
            >
              {loginLoading ? (
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
