import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PASSWORD_MIN_LENGTH, PASSWORD_REQUIRES_NUMBERS, PASSWORD_REQUIRES_SYMBOLS } from "@/config/supabase";
import * as DOMPurify from 'dompurify'; // Updated import to fix TypeScript issue

// Function to validate email format
const isValidEmail = (email: string): boolean => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
};

// Function to validate password strength
const isValidPassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { 
      valid: false, 
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` 
    };
  }
  
  if (PASSWORD_REQUIRES_NUMBERS && !/\d/.test(password)) {
    return { 
      valid: false, 
      message: "Password must contain at least one number" 
    };
  }
  
  if (PASSWORD_REQUIRES_SYMBOLS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { 
      valid: false, 
      message: "Password must contain at least one special character" 
    };
  }
  
  return { valid: true, message: "" };
};

// throttle login attempts
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW = 60 * 1000; // 1 minute in milliseconds

const OwnerLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("login");
  const [passwordFeedback, setPasswordFeedback] = useState<string>("");
  const [loginAttempts, setLoginAttempts] = useState<number[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // If user is already logged in, redirect to owner dashboard
  if (user) {
    return <Navigate to="/owner" />;
  }
  
  // Reset error when tab changes
  useEffect(() => {
    setAuthError(null);
    setPasswordFeedback("");
  }, [activeTab]);

  // Password validation feedback on change
  useEffect(() => {
    if (activeTab === "signup" && password) {
      const { valid, message } = isValidPassword(password);
      setPasswordFeedback(message);
    } else {
      setPasswordFeedback("");
    }
  }, [password, activeTab]);
  
  // Function to check if too many login attempts
  const checkLoginThrottle = (): boolean => {
    const now = Date.now();
    // Remove attempts older than the window
    const recentAttempts = loginAttempts.filter(time => now - time < LOGIN_ATTEMPT_WINDOW);
    setLoginAttempts(recentAttempts);
    
    // Too many attempts?
    if (recentAttempts.length >= LOGIN_ATTEMPT_LIMIT) {
      setAuthError(`Too many login attempts. Please try again in ${Math.ceil(LOGIN_ATTEMPT_WINDOW / 1000 / 60)} minute(s).`);
      return true;
    }
    return false;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    // Input validation
    if (!email.trim() || !password) {
      setAuthError("Email and password are required");
      return;
    }
    
    // Email format validation
    if (!isValidEmail(email)) {
      setAuthError("Please enter a valid email address");
      return;
    }
    
    // Check throttling
    if (checkLoginThrottle()) {
      return;
    }
    
    // Add this attempt
    setLoginAttempts(prev => [...prev, Date.now()]);
    
    setLoading(true);

    try {
      // Sanitize inputs (prevents potential XSS in error displays)
      const sanitizedEmail = DOMPurify.sanitize(email.trim().toLowerCase());
      
      const { error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (error) {
        console.error("Login error:", error.message);
        // Use generic error messages to prevent username enumeration
        setAuthError("Invalid email or password. Please try again.");
        return;
      }

      toast({
        title: "Login successful",
        description: "Welcome to your restaurant dashboard",
      });
      
      navigate("/owner");
    } catch (error) {
      console.error("Login error:", error);
      setAuthError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    // Input validation
    if (!email.trim() || !password) {
      setAuthError("Email and password are required");
      return;
    }
    
    // Email format validation
    if (!isValidEmail(email)) {
      setAuthError("Please enter a valid email address");
      return;
    }
    
    // Password strength check
    const { valid, message } = isValidPassword(password);
    if (!valid) {
      setAuthError(message);
      return;
    }
    
    setLoading(true);

    try {
      // Sanitize inputs
      const sanitizedEmail = DOMPurify.sanitize(email.trim().toLowerCase());
      
      const { error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          // Set data that will be accessible in RLS policies
          data: {
            registration_source: 'owner_portal',
          }
        }
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      toast({
        title: "Sign up successful",
        description: "Please check your email for verification instructions.",
      });
      
      // Switch to login tab after successful signup
      setActiveTab("login");
    } catch (error) {
      console.error("Signup error:", error);
      setAuthError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear errors when user starts typing
    if (authError) setAuthError(null);
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Clear errors when user starts typing
    if (authError) setAuthError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Restaurant Owner Portal</CardTitle>
          <CardDescription>Manage your restaurant's menus and orders</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={handleEmailChange}
                      autoComplete="email"
                      required
                      aria-invalid={authError ? "true" : "false"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      id="password"
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={handlePasswordChange}
                      autoComplete="current-password"
                      required
                      aria-invalid={authError ? "true" : "false"}
                    />
                  </div>
                  
                  {authError && (
                    <Alert variant="destructive">
                      <ShieldAlert className="h-4 w-4" />
                      <AlertDescription>{authError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      id="signupEmail"
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={handleEmailChange}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      id="signupPassword"
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={handlePasswordChange}
                      autoComplete="new-password"
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                      aria-invalid={passwordFeedback ? "true" : "false"}
                    />
                    
                    {passwordFeedback && (
                      <p className="text-xs text-amber-600">{passwordFeedback}</p>
                    )}
                    
                    {!passwordFeedback && password && isValidPassword(password).valid && (
                      <div className="flex items-center text-xs text-green-600">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Password meets requirements
                      </div>
                    )}
                  </div>
                  
                  {authError && (
                    <Alert variant="destructive">
                      <ShieldAlert className="h-4 w-4" />
                      <AlertDescription>{authError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Restaurant owners only. Contact administrator for access.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OwnerLogin;
