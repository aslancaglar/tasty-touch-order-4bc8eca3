import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('PRINTNODE_API_KEY');
    
    if (!apiKey) {
      throw new Error('PrintNode API key not configured');
    }

    const { action, ...payload } = await req.json();
    
    let url = '';
    let method = 'GET';
    let body = null;
    
    switch (action) {
      case 'getPrinters':
        url = 'https://api.printnode.com/printers';
        break;
        
      case 'testPrint':
        url = 'https://api.printnode.com/printjobs';
        method = 'POST';
        body = JSON.stringify(payload.printJob);
        break;
        
      case 'sendReceipt':
        url = 'https://api.printnode.com/printjobs';
        method = 'POST';
        body = JSON.stringify(payload.printJob);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    console.log(`PrintNode API call: ${action} to ${url}`);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Basic ${btoa(apiKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`PrintNode API error: ${response.status} - ${errorText}`);
      throw new Error(`PrintNode API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`PrintNode API success: ${action}`);
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in printnode-api function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});