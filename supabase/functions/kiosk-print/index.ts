
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== Kiosk Print Service Request ===')
    console.log('Method:', req.method)

    // Use service role key for secure operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const requestBody = await req.json()
    console.log('Request body keys:', Object.keys(requestBody))
    
    const { 
      restaurantId, 
      orderNumber, 
      receiptContent,
      printerIds = []
    } = requestBody

    if (!restaurantId || !orderNumber || !receiptContent) {
      throw new Error('Restaurant ID, order number, and receipt content are required')
    }

    console.log('Processing print request for restaurant:', restaurantId, 'order:', orderNumber)

    // Validate that the restaurant exists and has print configuration
    const { data: restaurant, error: restaurantError } = await supabaseClient
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .single()

    if (restaurantError || !restaurant) {
      console.error('Restaurant validation failed:', restaurantError)
      throw new Error('Invalid restaurant')
    }

    // Get print configuration
    const { data: printConfig, error: printConfigError } = await supabaseClient
      .from('restaurant_print_config')
      .select('configured_printers')
      .eq('restaurant_id', restaurantId)
      .single()

    if (printConfigError) {
      console.error('Print configuration error:', printConfigError)
      throw new Error('Print configuration not found')
    }

    // Get the PrintNode API key securely using the corrected function call
    const { data: apiKeyValue, error: keyError } = await supabaseClient
      .rpc('get_encrypted_api_key', {
        p_restaurant_id: restaurantId,
        p_service_name: 'printnode',
        p_key_name: 'primary',
        p_user_id: null  // Add this parameter to match the function signature
      })

    if (keyError) {
      console.error('API key retrieval error:', keyError)
      throw new Error('PrintNode API key not configured')
    }

    if (!apiKeyValue) {
      throw new Error('PrintNode API key not found')
    }

    console.log('API key retrieved successfully')

    // Determine which printers to use
    let targetPrinters = printerIds
    if (!targetPrinters.length && printConfig?.configured_printers) {
      const configuredPrinters = Array.isArray(printConfig.configured_printers) 
        ? printConfig.configured_printers 
        : []
      targetPrinters = configuredPrinters.map(id => String(id))
    }

    if (!targetPrinters.length) {
      throw new Error('No printers configured')
    }

    console.log(`Sending to ${targetPrinters.length} printers:`, targetPrinters)

    // Base64 encode the receipt content
    let encodedContent: string
    try {
      // Use TextEncoder for proper UTF-8 encoding
      const encoder = new TextEncoder()
      const bytes = encoder.encode(receiptContent)
      const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
      encodedContent = btoa(binaryString)
    } catch (encodingError) {
      console.error('Encoding error:', encodingError)
      throw new Error('Failed to encode receipt content')
    }

    // Send to PrintNode for each printer
    const printResults = []
    
    for (const printerId of targetPrinters) {
      console.log(`Sending to printer ID: ${printerId}`)
      
      try {
        const printJobPayload = {
          printer: parseInt(printerId, 10) || printerId,
          title: `Order #${orderNumber}`,
          contentType: "raw_base64",
          content: encodedContent,
          source: "Restaurant Kiosk"
        }
        
        const response = await fetch('https://api.printnode.com/printjobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(apiKeyValue + ':')}`
          },
          body: JSON.stringify(printJobPayload)
        })
        
        console.log(`PrintNode response status for printer ${printerId}: ${response.status}`)
        
        const responseText = await response.text()
        
        if (!response.ok) {
          let errorMessage = `PrintNode API error (${response.status})`
          try {
            const errorData = JSON.parse(responseText)
            errorMessage = errorData.message || errorData.error || errorMessage
          } catch (parseError) {
            errorMessage = `${errorMessage}: ${responseText}`
          }
          
          printResults.push({
            printerId,
            success: false,
            error: errorMessage
          })
          
          console.error(`Print failed for printer ${printerId}:`, errorMessage)
        } else {
          console.log(`Print successful for printer ${printerId}`)
          
          try {
            const successData = JSON.parse(responseText)
            printResults.push({
              printerId,
              success: true,
              jobId: successData.id || 'unknown'
            })
          } catch (parseError) {
            printResults.push({
              printerId,
              success: true,
              response: 'success'
            })
          }
        }
      } catch (printerError) {
        console.error(`Error sending to printer ${printerId}:`, printerError)
        printResults.push({
          printerId,
          success: false,
          error: printerError.message
        })
      }
    }

    // Prepare response
    const successfulPrints = printResults.filter(result => result.success)
    const failedPrints = printResults.filter(result => !result.success)
    
    console.log(`Print summary: ${successfulPrints.length} successful, ${failedPrints.length} failed`)

    return new Response(JSON.stringify({
      success: successfulPrints.length > 0,
      results: printResults,
      summary: {
        successful: successfulPrints.length,
        failed: failedPrints.length,
        total: printResults.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('=== Kiosk Print Service Error ===')
    console.error('Error:', error.message)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
