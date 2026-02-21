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

    const body = await req.json();
    
    // Handle new apply tracking payload (no action field)
    if (body.job_id && body.poster_email && !body.action) {
      // Track application click
      const { error } = await supabaseClient
        .from('job_applications')
        .insert({
          job_id: body.job_id,
          applicant_id: body.applicant_id,
        });

      if (error && !error.message?.includes('duplicate')) {
        console.error('Error tracking application:', error);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, jobData, applicationData, jobId, job_id } = body;

    // Get user for actions that require auth
    const { data: { user } } = await supabaseClient.auth.getUser();

    console.log(`Jobs management action: ${action}`);

    switch (action) {
      case 'create-job': {
        if (!user) throw new Error('You must be logged in to post jobs');
        
        const { title, company, location, job_type, salary_range, description, requirements, benefits, experience_level, deadline } = jobData;
        const insertData: Record<string, unknown> = {
          title, company, location, job_type, description,
          posted_by: user.id,
        };
        if (salary_range) insertData.salary_range = salary_range;
        if (requirements) insertData.requirements = requirements;
        if (benefits) insertData.benefits = benefits;
        if (experience_level) insertData.experience_level = experience_level;
        if (deadline) insertData.deadline = deadline;

        const { data, error } = await supabaseClient
          .from('jobs')
          .insert(insertData)
          .select('*')
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'list-jobs': {
        const { data, error } = await supabaseClient
          .from('jobs')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify(data), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'apply-job': {
        if (!user) throw new Error('You must be logged in to apply for jobs');
        
        // Check if already applied
        const { data: existingApp, error: checkError } = await supabaseClient
          .from('job_applications')
          .select('id')
          .eq('job_id', applicationData.job_id)
          .eq('applicant_id', user.id)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing application:', checkError);
        }

        if (existingApp) {
          throw new Error('You have already applied to this job');
        }

        // Create application and increment count
        const { data, error } = await supabaseClient
          .from('job_applications')
          .insert({
            ...applicationData,
            applicant_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Update applications count
        await supabaseClient.rpc('increment_application_count', {
          job_id: applicationData.job_id
        });

        return new Response(JSON.stringify(data), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'my-applications': {
        if (!user) throw new Error('You must be logged in to view your applications');
        
        const { data, error } = await supabaseClient
          .from('job_applications')
          .select(`
            *,
            jobs(title, company, location, salary_range)
          `)
          .eq('applicant_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify(data), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'job-applications': {
        if (!user) throw new Error('You must be logged in to view job applications');
        
        // Get applications for a specific job (for job posters)
        const jobId = job_id || (jobData && jobData.job_id);
        
        // First verify the user owns this job
        const { data: job, error: jobError } = await supabaseClient
          .from('jobs')
          .select('posted_by')
          .eq('id', jobId)
          .single();
          
        if (jobError || job.posted_by !== user.id) {
          throw new Error('Unauthorized');
        }
        
        const { data, error } = await supabaseClient
          .from('job_applications')
          .select(`
            *,
            profiles!job_applications_applicant_id_fkey(display_name, email)
          `)
          .eq('job_id', jobId);
          
        if (error) throw error;
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete-job': {
        if (!user) throw new Error('You must be logged in to delete jobs');
        
        // Verify the user owns this job
        const { data: job, error: jobError } = await supabaseClient
          .from('jobs')
          .select('posted_by')
          .eq('id', jobId)
          .single();
          
        if (jobError || job.posted_by !== user.id) {
          throw new Error('Unauthorized: You can only delete your own jobs');
        }
        
        // Delete the job
        const { error } = await supabaseClient
          .from('jobs')
          .delete()
          .eq('id', jobId);
          
        if (error) throw error;
        
        return new Response(JSON.stringify({ message: 'Job deleted successfully' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in manage-jobs:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
