
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user } } = await supabaseClient.auth.getUser(token)
    if (!user) {
      throw new Error('Unauthorized')
    }

    const { action, restaurantId, serviceName, keyName, apiKey, rotationReason } = await req.json()

    switch (action) {
      case 'store': {
        const { data, error } = await supabaseClient.rpc('store_encrypted_api_key', {
          p_restaurant_id: restaurantId,
          p_service_name: serviceName,
          p_key_name: keyName || 'primary',
          p_api_key: apiKey
        })

        if (error) throw error

        return new Response(JSON.stringify({ success: true, keyId: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'retrieve': {
        const { data, error } = await supabaseClient.rpc('get_encrypted_api_key', {
          p_restaurant_id: restaurantId,
          p_service_name: serviceName,
          p_key_name: keyName || 'primary'
        })

        if (error) throw error

        return new Response(JSON.stringify({ success: true, apiKey: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'rotate': {
        const { data, error } = await supabaseClient.rpc('rotate_api_key', {
          p_restaurant_id: restaurantId,
          p_service_name: serviceName,
          p_key_name: keyName || 'primary',
          p_new_api_key: apiKey
        })

        if (error) throw error

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'rotate_with_audit': {
        const { data, error } = await supabaseClient.rpc('rotate_api_key_with_audit', {
          p_restaurant_id: restaurantId,
          p_service_name: serviceName,
          p_key_name: keyName || 'primary',
          p_new_api_key: apiKey,
          p_rotation_reason: rotationReason || 'manual'
        })

        if (error) throw error

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'migrate_printnode_keys': {
        // Migrate existing PrintNode keys from plaintext to encrypted storage
        const { data: existingConfigs, error: fetchError } = await supabaseClient
          .from('restaurant_print_config')
          .select('restaurant_id, api_key')
          .not('api_key', 'is', null)

        if (fetchError) throw fetchError

        const results = []
        for (const config of existingConfigs || []) {
          if (config.api_key) {
            try {
              const { error: storeError } = await supabaseClient.rpc('store_encrypted_api_key', {
                p_restaurant_id: config.restaurant_id,
                p_service_name: 'printnode',
                p_key_name: 'primary',
                p_api_key: config.api_key
              })

              if (storeError) {
                console.error('Failed to migrate key for restaurant:', config.restaurant_id, storeError)
                results.push({ restaurant_id: config.restaurant_id, success: false, error: storeError.message })
              } else {
                // Clear the plaintext key after successful migration
                await supabaseClient
                  .from('restaurant_print_config')
                  .update({ api_key: null })
                  .eq('restaurant_id', config.restaurant_id)
                
                results.push({ restaurant_id: config.restaurant_id, success: true })
              }
            } catch (error) {
              console.error('Migration error for restaurant:', config.restaurant_id, error)
              results.push({ restaurant_id: config.restaurant_id, success: false, error: error.message })
            }
          }
        }

        return new Response(JSON.stringify({ success: true, results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
