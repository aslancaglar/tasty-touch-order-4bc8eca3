
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthMonitor } from "@/hooks/useAuthMonitor";
import { useSecurityHeaders } from "@/hooks/useSecurityHeaders";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, Mail } from "lucide-react";
import { validateEmail, validatePassword } from "@/utils/input-validation";
import { checkLoginRateLimit } from "@/utils/rate-limiter";
import { logSecurityEvent, handleError } from "@/utils/error-handler";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading, isAdmin, adminCheckCompleted } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginDelay, setLoginDelay] = useState(0);

  // Apply security headers
  useSecurityHeaders();

  // Monitor auth state changes for debugging
  useAuthMonitor('Auth');

  // Handle login delay countdown
  useEffect(() => {
    if (loginDelay > 0) {
      const timer = setTimeout(() => {
        setLoginDelay(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loginDelay]);

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
    
    if (loginDelay > 0) {
      toast({
        title: "Please wait",
        description: `Please wait ${loginDelay} seconds before trying again`,
        variant: "destructive"
      });
      return;
    }

    setLoginLoading(true);
    
    try {
      // Validate email
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.error);
      }

      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.error);
      }

      const sanitizedEmail = emailValidation.sanitized!;

      // Check rate limiting
      const rateLimitResult = checkLoginRateLimit(sanitizedEmail);
      if (!rateLimitResult.allowed) {
        const message = `Too many login attempts. Please try again in ${rateLimitResult.retryAfter} seconds.`;
        logSecurityEvent('Login rate limit exceeded', { email: sanitizedEmail });
        throw new Error(message);
      }
      
      console.log("Attempting login for:", sanitizedEmail);
      
      // Add artificial delay for failed attempts (security through obscurity)
      const startTime = Date.now();
      
      const { error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: password
      });
      
      if (error) {
        console.error("Login error:", error);
        
        // Add delay for failed login attempts
        const elapsed = Date.now() - startTime;
        const minDelay = 2000; // 2 seconds minimum delay
        if (elapsed < minDelay) {
          await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
        }
        
        // Set progressive delay for repeated failures
        setLoginDelay(5); // 5 second delay before next attempt
        
        logSecurityEvent('Failed login attempt', { 
          email: sanitizedEmail,
          error: error.message 
        });
        
        throw error;
      }
      
      console.log("Login successful - auth state will handle redirect");
      
      logSecurityEvent('Successful login', { email: sanitizedEmail });
      
      toast({
        title: "Login successful",
        description: "Welcome back to QimboKiosk!"
      });
      
      // Don't set loading to false - let auth state handle everything
      
    } catch (error: any) {
      const errorDetails = handleError(error, 'Auth Login');
      console.error("Login failed:", errorDetails);
      
      toast({
        title: "Login failed",
        description: errorDetails.message,
        variant: "destructive"
      });
      setLoginLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Basic input sanitization on change
    const sanitized = value.replace(/[<>]/g, '');
    setEmail(sanitized);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
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
                  onChange={handleEmailChange}
                  className="pl-10" 
                  required 
                  maxLength={254}
                  autoComplete="email"
                  disabled={loginLoading || loginDelay > 0}
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
                  disabled={loginLoading || loginDelay > 0}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={handlePasswordChange}
                  className="pr-10" 
                  required 
                  maxLength={128}
                  autoComplete="current-password"
                  disabled={loginLoading || loginDelay > 0}
                />
              </div>
            </div>
            
            {loginDelay > 0 && (
              <div className="text-sm text-amber-600 text-center">
                Please wait {loginDelay} seconds before trying again
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginLoading || loginDelay > 0}
            >
              {loginLoading ? (
                <span className="flex items-center gap-1">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Logging in...
                </span>
              ) : loginDelay > 0 ? (
                <span>Please wait {loginDelay}s</span>
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
