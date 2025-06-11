
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
    console.log('=== API Key Manager Request ===')
    console.log('Method:', req.method)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))

    // Use service role key for admin operations with vault
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      throw new Error('Authorization header is required')
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token extracted, length:', token.length)
    
    // Verify the user is authenticated with the regular client
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )
    
    const { data: { user }, error: userError } = await userClient.auth.getUser(token)
    
    if (userError) {
      console.error('User authentication error:', userError)
      throw new Error(`Authentication failed: ${userError.message}`)
    }
    
    if (!user) {
      console.error('No user found with provided token')
      throw new Error('User not authenticated')
    }

    console.log('User authenticated:', user.id, user.email)

    const requestBody = await req.json()
    console.log('Request body:', JSON.stringify(requestBody, null, 2))
    
    const { action, restaurantId, serviceName, keyName, apiKey, rotationReason } = requestBody

    if (!restaurantId) {
      throw new Error('Restaurant ID is required')
    }

    console.log('Checking permissions for restaurant:', restaurantId, 'user:', user.id)

    // Enhanced permission verification with detailed logging
    const { data: ownership, error: ownershipError } = await supabaseClient
      .from('restaurant_owners')
      .select('id, user_id, restaurant_id')
      .eq('restaurant_id', restaurantId)
      .eq('user_id', user.id)

    console.log('Ownership query result:', { ownership, ownershipError })

    let hasPermission = false
    
    if (ownership && ownership.length > 0) {
      hasPermission = true
      console.log('User has owner permission via restaurant_owners table')
    } else {
      console.log('No ownership found, checking admin status')
      
      // Check if user is admin
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, is_admin, email')
        .eq('id', user.id)
        .single()

      console.log('Profile query result:', { profile, profileError })

      if (profile?.is_admin) {
        hasPermission = true
        console.log('User has admin permission')
      }
    }

    if (!hasPermission) {
      console.error('Permission denied for user:', user.id, 'restaurant:', restaurantId)
      throw new Error('Insufficient permissions to access this restaurant')
    }

    console.log('Permission check passed, proceeding with action:', action)

    switch (action) {
      case 'store': {
        console.log('Storing API key for restaurant:', restaurantId, 'service:', serviceName)
        
        if (!apiKey || !serviceName) {
          throw new Error('API key and service name are required')
        }
        
        // Use the built-in store_encrypted_api_key function
        const { data: keyRecord, error: keyError } = await supabaseClient
          .rpc('store_encrypted_api_key', {
            p_restaurant_id: restaurantId,
            p_service_name: serviceName,
            p_key_name: keyName || 'primary',
            p_api_key: apiKey
          })

        if (keyError) {
          console.error('Key storage error details:', {
            code: keyError.code,
            message: keyError.message,
            details: keyError.details,
            hint: keyError.hint
          })
          throw new Error(`Failed to store API key: ${keyError.message}`)
        }

        console.log('API key stored successfully with ID:', keyRecord)

        return new Response(JSON.stringify({ 
          success: true, 
          keyId: keyRecord,
          message: 'API key stored securely'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'retrieve': {
        console.log('Retrieving API key for restaurant:', restaurantId, 'service:', serviceName)
        
        // Use the built-in get_encrypted_api_key function
        const { data: apiKeyValue, error: keyError } = await supabaseClient
          .rpc('get_encrypted_api_key', {
            p_restaurant_id: restaurantId,
            p_service_name: serviceName,
            p_key_name: keyName || 'primary'
          })

        if (keyError) {
          console.error('Key retrieval error:', keyError)
          return new Response(JSON.stringify({ 
            success: true, 
            apiKey: null,
            message: 'API key not found'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        console.log('API key retrieved successfully')

        return new Response(JSON.stringify({ 
          success: true, 
          apiKey: apiKeyValue 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'rotate': {
        console.log('Rotating API key for restaurant:', restaurantId, 'service:', serviceName)
        
        if (!apiKey) {
          throw new Error('New API key is required for rotation')
        }
        
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
          throw new Error(`Failed to rotate API key: ${rotateError.message}`)
        }

        console.log('API key rotated successfully')

        return new Response(JSON.stringify({ 
          success: true,
          message: 'API key rotated successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'rotate_with_audit': {
        console.log('Rotating API key with audit for restaurant:', restaurantId, 'service:', serviceName)
        
        if (!apiKey) {
          throw new Error('New API key is required for rotation')
        }
        
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
          console.error('Key rotation with audit error:', rotateError)
          throw new Error(`Failed to rotate API key: ${rotateError.message}`)
        }

        console.log('API key rotated with audit successfully')

        return new Response(JSON.stringify({ 
          success: true,
          message: 'API key rotated and logged successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'migrate_printnode_keys': {
        console.log('Migration action called - no longer needed')
        // This action is no longer needed since api_key column was removed
        return new Response(JSON.stringify({ 
          success: true, 
          results: [],
          message: 'Migration not needed - all keys are already secure'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      default:
        console.error('Invalid action requested:', action)
        throw new Error(`Invalid action: ${action}`)
    }
  } catch (error) {
    console.error('=== API Key Manager Error ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    // Return more specific error information
    const errorResponse = {
      error: error.message,
      type: error.constructor.name,
      timestamp: new Date().toISOString()
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
