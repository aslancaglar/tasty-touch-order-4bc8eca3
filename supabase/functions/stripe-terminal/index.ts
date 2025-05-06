
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@11.18.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, restaurantId, amount, currency = 'eur', description = 'Restaurant order' } = await req.json();
    
    if (!restaurantId) {
      throw new Error('Restaurant ID is required');
    }
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Check auth token (except for webhook endpoints which would use a different auth mechanism)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized access' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if user has access to this restaurant
    const { data: isOwner, error: ownerCheckError } = await supabaseClient.rpc(
      'is_restaurant_owner',
      { restaurant_uuid: restaurantId }
    );
    
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
      
    const isAdmin = userProfile?.is_admin || false;
    
    if ((ownerCheckError || !isOwner) && !isAdmin) {
      console.error('Restaurant ownership check failed:', ownerCheckError);
      return new Response(
        JSON.stringify({ error: 'You do not have permission to access this restaurant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the restaurant's payment configuration
    const { data: configData, error: configError } = await supabaseClient
      .from('restaurant_payment_config')
      .select('stripe_api_key, stripe_terminal_location_id, stripe_enabled, stripe_terminal_enabled')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();
    
    if (configError && configError.code !== 'PGRST116') {
      console.error('Error fetching payment config:', configError);
      throw new Error('Failed to retrieve payment configuration: ' + configError.message);
    }
    
    // Check if Stripe is properly configured
    if (!configData || !configData.stripe_api_key || !configData.stripe_enabled) {
      throw new Error('Stripe API key not configured or Stripe is not enabled. Please set up your payment settings first.');
    }
    
    // Validate API key format (basic check)
    if (!configData.stripe_api_key.startsWith('sk_')) {
      throw new Error('Invalid Stripe API key format. The key should start with "sk_".');
    }
    
    const stripe = new Stripe(configData.stripe_api_key, { apiVersion: '2023-10-16' });
    
    try {
      switch (action) {
        case 'create_payment_intent': {
          // Validate terminal is enabled
          if (!configData.stripe_terminal_enabled) {
            throw new Error('Stripe Terminal is not enabled for this restaurant.');
          }
          
          // For production, this amount should be validated server-side
          if (!amount || amount <= 0) {
            throw new Error('Invalid amount');
          }
          
          // Create a payment intent for the terminal
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency,
            payment_method_types: ['card_present'],
            capture_method: 'automatic',
            description,
          });
          
          return new Response(
            JSON.stringify({ paymentIntent }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        case 'create_connection_token': {
          // Validate terminal is enabled
          if (!configData.stripe_terminal_enabled) {
            throw new Error('Stripe Terminal is not enabled for this restaurant.');
          }
          
          // Create a connection token for the terminal
          const connectionToken = await stripe.terminal.connectionTokens.create();
          
          return new Response(
            JSON.stringify({ secret: connectionToken.secret }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        case 'get_readers': {
          // Validate terminal is enabled
          if (!configData.stripe_terminal_enabled) {
            throw new Error('Stripe Terminal is not enabled for this restaurant.');
          }
          
          // Get available terminal readers
          const readers = await stripe.terminal.readers.list({
            location: configData.stripe_terminal_location_id || undefined,
            limit: 10,
          });
          
          return new Response(
            JSON.stringify({ readers: readers.data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        default:
          throw new Error('Invalid action');
      }
    } catch (stripeError) {
      console.error('Stripe API error:', stripeError);
      // Handle Stripe specific errors with more detailed messages
      let errorMessage = 'Stripe API error occurred.';
      
      if (stripeError.type === 'StripeAuthenticationError') {
        errorMessage = 'Authentication with Stripe failed. Your API key may be invalid.';
      } else if (stripeError.type === 'StripePermissionError') {
        errorMessage = 'Your Stripe account does not have permission to perform this action.';
      } else if (stripeError.type === 'StripeRateLimitError') {
        errorMessage = 'Too many requests to Stripe API. Please try again later.';
      } else if (stripeError.message) {
        errorMessage = stripeError.message;
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
