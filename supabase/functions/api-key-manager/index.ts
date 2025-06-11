
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
        // Store the API key in Vault using service role
        const { data: secretId, error: vaultError } = await supabaseClient
          .from('vault.secrets')
          .insert({
            name: `${restaurantId}-${serviceName}-${keyName || 'primary'}`,
            secret: apiKey
          })
          .select('id')
          .single()

        if (vaultError) {
          console.error('Vault error:', vaultError)
          throw new Error('Failed to store API key securely')
        }

        // Store the reference in our table
        const { data: keyRecord, error: keyError } = await supabaseClient
          .from('restaurant_api_keys')
          .upsert({
            restaurant_id: restaurantId,
            service_name: serviceName,
            key_name: keyName || 'primary',
            encrypted_key_id: secretId.id,
            is_active: true,
            last_rotated: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'restaurant_id,service_name,key_name'
          })
          .select('id')
          .single()

        if (keyError) {
          console.error('Key storage error:', keyError)
          throw new Error('Failed to store API key reference')
        }

        return new Response(JSON.stringify({ success: true, keyId: keyRecord.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'retrieve': {
        // Get the secret ID from our table
        const { data: keyRecord, error: keyError } = await supabaseClient
          .from('restaurant_api_keys')
          .select('encrypted_key_id')
          .eq('restaurant_id', restaurantId)
          .eq('service_name', serviceName)
          .eq('key_name', keyName || 'primary')
          .eq('is_active', true)
          .single()

        if (keyError || !keyRecord) {
          return new Response(JSON.stringify({ success: true, apiKey: null }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Retrieve the decrypted key from Vault
        const { data: secret, error: secretError } = await supabaseClient
          .from('vault.decrypted_secrets')
          .select('decrypted_secret')
          .eq('id', keyRecord.encrypted_key_id)
          .single()

        if (secretError) {
          console.error('Secret retrieval error:', secretError)
          throw new Error('Failed to retrieve API key')
        }

        return new Response(JSON.stringify({ success: true, apiKey: secret.decrypted_secret }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'rotate': {
        // Get the current secret ID
        const { data: keyRecord, error: keyError } = await supabaseClient
          .from('restaurant_api_keys')
          .select('encrypted_key_id')
          .eq('restaurant_id', restaurantId)
          .eq('service_name', serviceName)
          .eq('key_name', keyName || 'primary')
          .eq('is_active', true)
          .single()

        if (keyError || !keyRecord) {
          throw new Error('API key not found for rotation')
        }

        // Create new secret in Vault
        const { data: newSecret, error: newSecretError } = await supabaseClient
          .from('vault.secrets')
          .insert({
            name: `${restaurantId}-${serviceName}-${keyName || 'primary'}-${Date.now()}`,
            secret: apiKey
          })
          .select('id')
          .single()

        if (newSecretError) {
          console.error('New secret creation error:', newSecretError)
          throw new Error('Failed to create new API key')
        }

        // Update the reference
        const { error: updateError } = await supabaseClient
          .from('restaurant_api_keys')
          .update({
            encrypted_key_id: newSecret.id,
            updated_at: new Date().toISOString(),
            last_rotated: new Date().toISOString()
          })
          .eq('restaurant_id', restaurantId)
          .eq('service_name', serviceName)
          .eq('key_name', keyName || 'primary')

        if (updateError) {
          console.error('Key update error:', updateError)
          throw new Error('Failed to update API key reference')
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'rotate_with_audit': {
        // Similar to rotate but with audit logging
        const { data: keyRecord, error: keyError } = await supabaseClient
          .from('restaurant_api_keys')
          .select('encrypted_key_id')
          .eq('restaurant_id', restaurantId)
          .eq('service_name', serviceName)
          .eq('key_name', keyName || 'primary')
          .eq('is_active', true)
          .single()

        if (keyError || !keyRecord) {
          throw new Error('API key not found for rotation')
        }

        // Create hash of old key for audit trail
        const oldKeyHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyRecord.encrypted_key_id))
        const hashArray = Array.from(new Uint8Array(oldKeyHash))
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

        // Create new secret in Vault
        const { data: newSecret, error: newSecretError } = await supabaseClient
          .from('vault.secrets')
          .insert({
            name: `${restaurantId}-${serviceName}-${keyName || 'primary'}-${Date.now()}`,
            secret: apiKey
          })
          .select('id')
          .single()

        if (newSecretError) {
          throw new Error('Failed to create new API key')
        }

        // Update the reference
        const { error: updateError } = await supabaseClient
          .from('restaurant_api_keys')
          .update({
            encrypted_key_id: newSecret.id,
            updated_at: new Date().toISOString(),
            last_rotated: new Date().toISOString()
          })
          .eq('restaurant_id', restaurantId)
          .eq('service_name', serviceName)
          .eq('key_name', keyName || 'primary')

        if (updateError) {
          throw new Error('Failed to update API key reference')
        }

        // Log the rotation
        await supabaseClient
          .from('api_key_rotation_log')
          .insert({
            restaurant_id: restaurantId,
            service_name: serviceName,
            key_name: keyName || 'primary',
            rotation_type: 'manual',
            old_key_hash: hashHex,
            rotation_reason: rotationReason || 'manual',
            rotated_by: user.id
          })

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
