
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Server-side validation patterns
const SECURITY_PATTERNS = {
  XSS: [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i,
    /onmouseover=/i,
  ],
  SQL_INJECTION: [
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /update\s+set/i,
  ],
  PATH_TRAVERSAL: [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i,
  ],
};

const MAX_LENGTHS = {
  text: 1000,
  name: 255,
  description: 5000,
  email: 255,
  url: 1000,
};

function validateInput(input: string, type: string = 'text', required: boolean = false): string {
  // Check if required
  if (required && (!input || input.trim().length === 0)) {
    throw new Error('This field is required');
  }

  // Return empty string if not required and empty
  if (!input || input.trim().length === 0) {
    return '';
  }

  // Type checking
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Length validation
  const maxLength = MAX_LENGTHS[type] || MAX_LENGTHS.text;
  if (input.length > maxLength) {
    throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
  }

  // Security pattern detection
  for (const pattern of SECURITY_PATTERNS.XSS) {
    if (pattern.test(input)) {
      throw new Error('Potentially malicious content detected (XSS)');
    }
  }

  for (const pattern of SECURITY_PATTERNS.SQL_INJECTION) {
    if (pattern.test(input)) {
      throw new Error('Potentially malicious content detected (SQL Injection)');
    }
  }

  for (const pattern of SECURITY_PATTERNS.PATH_TRAVERSAL) {
    if (pattern.test(input)) {
      throw new Error('Potentially malicious content detected (Path Traversal)');
    }
  }

  // Email validation
  if (type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input)) {
      throw new Error('Invalid email format');
    }
  }

  // URL validation
  if (type === 'url') {
    try {
      new URL(input);
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  // Basic sanitization
  return input
    .replace(/[<>'"]/g, '')
    .trim();
}

function validateNumericInput(input: string | number, min?: number, max?: number, allowDecimals: boolean = true): number {
  const numValue = typeof input === 'string' ? parseFloat(input) : input;
  
  if (isNaN(numValue)) {
    throw new Error('Input must be a valid number');
  }

  if (!allowDecimals && numValue % 1 !== 0) {
    throw new Error('Input must be a whole number');
  }

  if (min !== undefined && numValue < min) {
    throw new Error(`Value must be at least ${min}`);
  }

  if (max !== undefined && numValue > max) {
    throw new Error(`Value must not exceed ${max}`);
  }

  return numValue;
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

    const { formType, data: formData, schema } = await req.json()

    console.log('Validating form:', formType, 'with schema:', schema)

    const validatedData: Record<string, any> = {}

    // Validate each field according to schema
    for (const [key, value] of Object.entries(formData)) {
      const fieldSchema = schema[key]
      if (!fieldSchema) continue

      try {
        if (fieldSchema.type === 'number') {
          validatedData[key] = validateNumericInput(
            value,
            fieldSchema.min,
            fieldSchema.max,
            fieldSchema.allowDecimals
          )
        } else {
          validatedData[key] = validateInput(
            value,
            fieldSchema.type,
            fieldSchema.required
          )
        }
      } catch (error) {
        throw new Error(`${key}: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        validatedData,
        message: 'Form data validated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Validation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        code: 'VALIDATION_ERROR'
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
