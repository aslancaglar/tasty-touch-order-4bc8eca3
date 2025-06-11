
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
    // Use service role key for admin operations with vault
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the user is authenticated with the regular client
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )
    
    const { data: { user } } = await userClient.auth.getUser(token)
    if (!user) {
      throw new Error('Unauthorized')
    }

    const { action, restaurantId, serviceName, keyName, apiKey, rotationReason } = await req.json()

    // Verify user has permission to access this restaurant
    const { data: ownership, error: ownershipError } = await supabaseClient
      .from('restaurant_owners')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('user_id', user.id)
      .single()

    if (ownershipError || !ownership) {
      // Check if user is admin
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (profileError || !profile?.is_admin) {
        throw new Error('Insufficient permissions to access this restaurant')
      }
    }

    switch (action) {
      case 'store': {
        console.log('Storing API key for restaurant:', restaurantId, 'service:', serviceName)
        
        // Use the built-in store_encrypted_api_key function instead of manual vault operations
        const { data: keyRecord, error: keyError } = await supabaseClient
          .rpc('store_encrypted_api_key', {
            p_restaurant_id: restaurantId,
            p_service_name: serviceName,
            p_key_name: keyName || 'primary',
            p_api_key: apiKey
          })

        if (keyError) {
          console.error('Key storage error:', keyError)
          throw new Error('Failed to store API key: ' + keyError.message)
        }

        console.log('API key stored successfully with ID:', keyRecord)

        return new Response(JSON.stringify({ success: true, keyId: keyRecord }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'retrieve': {
        // Use the built-in get_encrypted_api_key function
        const { data: apiKeyValue, error: keyError } = await supabaseClient
          .rpc('get_encrypted_api_key', {
            p_restaurant_id: restaurantId,
            p_service_name: serviceName,
            p_key_name: keyName || 'primary'
          })

        if (keyError) {
          console.error('Key retrieval error:', keyError)
          return new Response(JSON.stringify({ success: true, apiKey: null }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ success: true, apiKey: apiKeyValue }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'rotate': {
        // Use the built-in rotate_api_key function
        const { data: rotateResult, error: rotateError } = await supabaseClient
          .rpc('rotate_api_key', {
            p_restaurant_id: restaurantId,
            p_service_name: serviceName,
            p_key_name: keyName || 'primary',
            p_new_api_key: apiKey
          })

        if (rotateError) {
          console.error('Key rotation error:', rotateError)
          throw new Error('Failed to rotate API key: ' + rotateError.message)
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'rotate_with_audit': {
        // Use the built-in rotate_api_key_with_audit function
        const { data: rotateResult, error: rotateError } = await supabaseClient
          .rpc('rotate_api_key_with_audit', {
            p_restaurant_id: restaurantId,
            p_service_name: serviceName,
            p_key_name: keyName || 'primary',
            p_new_api_key: apiKey,
            p_rotation_reason: rotationReason || 'manual'
          })

        if (rotateError) {
          console.error('Key rotation error:', rotateError)
          throw new Error('Failed to rotate API key: ' + rotateError.message)
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'migrate_printnode_keys': {
        // This action is no longer needed since api_key column was removed
        return new Response(JSON.stringify({ success: true, results: [] }), {
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
