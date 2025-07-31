import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, restaurantId } = await req.json()

    // Verify user has access to this restaurant
    const { data: ownershipData, error: ownershipError } = await supabaseClient
      .from('restaurant_owners')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('user_id', user.id)
      .single()

    if (ownershipError || !ownershipData) {
      return new Response(
        JSON.stringify({ error: 'Access denied to restaurant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get PrintNode API key from secrets
    const printnodeApiKey = Deno.env.get('PRINTNODE_API_KEY')
    if (!printnodeApiKey) {
      return new Response(
        JSON.stringify({ error: 'PrintNode API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let response
    
    if (action === 'fetch-printers') {
      // Fetch printers from PrintNode API
      const printnodeResponse = await fetch('https://api.printnode.com/printers', {
        headers: {
          'Authorization': `Basic ${btoa(printnodeApiKey + ':')}`
        }
      })

      if (!printnodeResponse.ok) {
        throw new Error(`PrintNode API error: ${printnodeResponse.status}`)
      }

      const printers = await printnodeResponse.json()
      
      // Transform printer data
      const transformedPrinters = printers.map((printer: any) => ({
        id: printer.id.toString(),
        name: printer.name,
        description: printer.description || (printer.computer ? printer.computer.name : undefined),
        state: printer.state === "online" ? "online" : "offline",
        selected: false
      }))

      response = { printers: transformedPrinters }
      
    } else if (action === 'test-printer') {
      const { printerId } = await req.json()
      
      // Send test print to PrintNode
      const testPrintData = {
        printerId: parseInt(printerId),
        title: "Test Print",
        contentType: "raw_base64",
        content: btoa(`
Test Print Receipt
==================
Date: ${new Date().toLocaleString()}
Restaurant Test Print
==================

This is a test print to verify
your printer is working correctly.

Thank you!

==================


`),
        source: "Restaurant Kiosk Test"
      }

      const printnodeResponse = await fetch('https://api.printnode.com/printjobs', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(printnodeApiKey + ':')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPrintData)
      })

      if (!printnodeResponse.ok) {
        throw new Error(`PrintNode API error: ${printnodeResponse.status}`)
      }

      const result = await printnodeResponse.json()
      response = { success: true, jobId: result }
      
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('PrintNode proxy error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})