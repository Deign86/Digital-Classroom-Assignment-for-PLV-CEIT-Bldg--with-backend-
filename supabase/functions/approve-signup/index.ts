// Follow this setup guide: https://supabase.com/docs/guides/functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApproveSignupRequest {
  signupRequestId: string
  password: string
  adminFeedback?: string
}

interface ApproveSignupResponse {
  success: boolean
  user?: {
    id: string
    email: string
    name: string
    role: 'admin' | 'faculty'
    department?: string
  }
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the request is from an authenticated admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // These are auto-injected by Supabase Edge Functions
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    // Create client with anon key to verify the admin's session
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // Verify admin session
    const { data: { user: adminUser }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !adminUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid session' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Check if user is admin
    const { data: adminProfile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    // Parse request body
    const { signupRequestId, password, adminFeedback }: ApproveSignupRequest = await req.json()

    if (!signupRequestId || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Signup request ID and password are required' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Password must be at least 8 characters long' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch the signup request
    const { data: signupRequest, error: fetchError } = await supabaseAdmin
      .from('signup_requests')
      .select('*')
      .eq('id', signupRequestId)
      .single()

    if (fetchError || !signupRequest) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Signup request not found' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    if (signupRequest.status !== 'pending') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Signup request has already been processed' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Create the user account
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: signupRequest.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: signupRequest.name,
        role: 'faculty',
        department: signupRequest.department,
      },
    })

    if (createError || !newUser.user) {
      console.error('User creation error:', createError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: createError?.message || 'Failed to create user account' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Wait for profile trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Update signup request status
    await supabaseAdmin
      .from('signup_requests')
      .update({ 
        status: 'approved',
        admin_feedback: adminFeedback || 'Your account has been approved'
      })
      .eq('id', signupRequestId)

    // Fetch the created profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', newUser.user.id)
      .single()

    return new Response(
      JSON.stringify({
        success: true,
        user: profile ? {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          department: profile.department,
        } : null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
