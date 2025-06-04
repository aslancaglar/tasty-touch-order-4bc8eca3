
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
import * as DOMPurify from 'dompurify';

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
  const { user, loading: authLoading } = useAuth();

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

  // Wait for auth to finish loading before redirecting
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If user is already logged in, redirect to owner dashboard
  if (user) {
    console.log("User already logged in, redirecting to /owner");
    return <Navigate to="/owner" />;
  }
  
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
    
    console.log("Login attempt started", { email: email.trim() });
    
    // Input validation
    if (!email.trim() || !password) {
      console.log("Login failed: Missing email or password");
      setAuthError("Email and password are required");
      return;
    }
    
    // Email format validation
    if (!isValidEmail(email)) {
      console.log("Login failed: Invalid email format", { email: email.trim() });
      setAuthError("Please enter a valid email address");
      return;
    }
    
    // Check throttling
    if (checkLoginThrottle()) {
      console.log("Login failed: Rate limited");
      return;
    }
    
    // Add this attempt
    setLoginAttempts(prev => [...prev, Date.now()]);
    
    setLoading(true);

    try {
      // Sanitize inputs (prevents potential XSS in error displays)
      const sanitizedEmail = DOMPurify.sanitize(email.trim().toLowerCase());
      console.log("Attempting login with sanitized email", { sanitizedEmail });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      console.log("Supabase auth response", { 
        user: data?.user?.id, 
        session: !!data?.session,
        error: error?.message 
      });

      if (error) {
        console.error("Login error details:", {
          message: error.message,
          status: error.status,
          name: error.name
        });
        
        // Provide more specific error messages based on error type
        if (error.message.includes('Invalid login credentials')) {
          setAuthError("Invalid email or password. Please check your credentials and try again.");
        } else if (error.message.includes('Email not confirmed')) {
          setAuthError("Please check your email and click the confirmation link before logging in.");
        } else if (error.message.includes('Too many requests')) {
          setAuthError("Too many login attempts. Please wait a few minutes before trying again.");
        } else {
          setAuthError(`Login failed: ${error.message}`);
        }
        return;
      }

      if (!data?.user) {
        console.error("Login succeeded but no user data returned");
        setAuthError("Login succeeded but user data is missing. Please try again.");
        return;
      }

      console.log("Login successful", { userId: data.user.id });
      
      toast({
        title: "Login successful",
        description: "Welcome to your restaurant dashboard",
      });
      
      navigate("/owner");
    } catch (error) {
      console.error("Login exception:", {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      if (error instanceof Error) {
        setAuthError(`Login failed: ${error.message}`);
      } else {
        setAuthError("An unexpected error occurred during login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    console.log("Signup attempt started", { email: email.trim() });
    
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
      console.log("Attempting signup with sanitized email", { sanitizedEmail });
      
      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          // Set data that will be accessible in RLS policies
          data: {
            registration_source: 'owner_portal',
          }
        }
      });

      console.log("Supabase signup response", { 
        user: data?.user?.id, 
        session: !!data?.session,
        error: error?.message 
      });

      if (error) {
        console.error("Signup error details:", {
          message: error.message,
          status: error.status,
          name: error.name
        });
        setAuthError(error.message);
        return;
      }

      console.log("Signup successful", { userId: data?.user?.id });

      toast({
        title: "Sign up successful",
        description: "Please check your email for verification instructions.",
      });
      
      // Switch to login tab after successful signup
      setActiveTab("login");
    } catch (error) {
      console.error("Signup exception:", {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      if (error instanceof Error) {
        setAuthError(`Signup failed: ${error.message}`);
      } else {
        setAuthError("An unexpected error occurred during signup. Please try again.");
      }
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
