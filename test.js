import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cwobezizmyglttdluxed.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3b2Jleml6bXlnbHR0ZGx1eGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MTYwOTAsImV4cCI6MjA5MzM5MjA5MH0.DXDf4YFCISxWVLAwGtDLeNnHpwzOYN6P76FhKG3ovPA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Testing Supabase connection...");
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@test.com',
      password: 'wrongpassword'
    });
    console.log("Result:", data, error);
  } catch(e) {
    console.error("Exception:", e);
  }
}

test();
