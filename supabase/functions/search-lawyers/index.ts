import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { action, state, specialization, location, lawyerData, slug } = await req.json();

    console.log(`Lawyer search action: ${action}`);

    switch (action) {
      case 'search': {
        let query = supabaseClient
          .from('lawyers')
          .select('*')
          .eq('verification_status', 'verified');

        if (state) {
          query = query.ilike('state', `%${state}%`);
        }

        if (location) {
          query = query.or(`city.ilike.%${location}%,location.ilike.%${location}%`);
        }

        if (specialization) {
          query = query.contains('specialization', [specialization]);
        }

        const { data, error } = await query
          .order('rating', { ascending: false })
          .order('years_experience', { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify(data), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get-all': {
        const { data, error } = await supabaseClient
          .from('lawyers')
          .select('*')
          .eq('verification_status', 'verified')
          .order('rating', { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify(data), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get-by-slug': {
        const { data, error } = await supabaseClient
          .from('lawyers')
          .select('*')
          .eq('slug', slug)
          .eq('verification_status', 'verified')
          .single();

        if (error) {
          // Try by ID if slug not found
          const { data: dataById, error: errorById } = await supabaseClient
            .from('lawyers')
            .select('*')
            .eq('id', slug)
            .eq('verification_status', 'verified')
            .single();

          if (errorById) throw errorById;
          return new Response(JSON.stringify(dataById), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify(data), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get-states': {
        const { data, error } = await supabaseClient
          .from('lawyers')
          .select('state')
          .eq('verification_status', 'verified');

        if (error) throw error;
        
        const uniqueStates = [...new Set(data.map(lawyer => lawyer.state))].filter(Boolean).sort();
        return new Response(JSON.stringify(uniqueStates), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get-specializations': {
        const { data, error } = await supabaseClient
          .from('lawyers')
          .select('specialization')
          .eq('verification_status', 'verified');

        if (error) throw error;
        
        const allSpecializations = data.flatMap(lawyer => lawyer.specialization || []);
        const uniqueSpecializations = [...new Set(allSpecializations)].filter(Boolean).sort();
        
        return new Response(JSON.stringify(uniqueSpecializations), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'register': {
        // Check if user is authenticated
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
          return new Response(JSON.stringify({ error: 'You must be logged in to register as a lawyer' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if user already has a lawyer profile
        const { data: existingProfile } = await supabaseClient
          .from('lawyers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (existingProfile) {
          return new Response(JSON.stringify({ 
            error: 'You already have a lawyer profile registered' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Registering lawyer for user:', user.id, 'with data:', lawyerData);

        const { data, error } = await supabaseClient
          .from('lawyers')
          .insert({
            ...lawyerData,
            user_id: user.id,
            verified: false,
            verification_status: 'pending',
          })
          .select()
          .single();

        if (error) {
          console.error('Error inserting lawyer:', error);
          throw error;
        }

        console.log('Lawyer registered successfully:', data);
        
        return new Response(JSON.stringify({ 
          success: true,
          data: data,
          message: 'Registration submitted! Our support team will review your profile.'
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'update-profile': {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabaseClient
          .from('lawyers')
          .update(lawyerData)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'update-availability': {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { availabilityStatus } = lawyerData;
        const { data, error } = await supabaseClient
          .from('lawyers')
          .update({ availability_status: availabilityStatus })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in search-lawyers:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
