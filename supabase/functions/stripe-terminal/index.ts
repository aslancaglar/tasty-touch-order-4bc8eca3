
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
    
    // Get the restaurant's payment configuration
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: configData, error: configError } = await supabaseClient
      .from('restaurant_payment_config')
      .select('stripe_api_key, stripe_terminal_location_id')
      .eq('restaurant_id', restaurantId)
      .single();
    
    if (configError || !configData) {
      throw new Error('Payment configuration not found');
    }
    
    const { stripe_api_key, stripe_terminal_location_id } = configData;
    if (!stripe_api_key) {
      throw new Error('Stripe API key not configured');
    }
    
    const stripe = new Stripe(stripe_api_key, { apiVersion: '2023-10-16' });
    
    switch (action) {
      case 'create_payment_intent': {
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
        // Create a connection token for the terminal
        const connectionToken = await stripe.terminal.connectionTokens.create();
        
        return new Response(
          JSON.stringify({ secret: connectionToken.secret }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'get_readers': {
        // Get available terminal readers
        const readers = await stripe.terminal.readers.list({
          location: stripe_terminal_location_id || undefined,
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
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
