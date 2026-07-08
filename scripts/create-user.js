// Insert a user into Angola_field_cash_users with a bcrypt-hashed password.
//
// 1. Edit the USER object below with the real email / password / name.
// 2. Run:  node scripts/create-user.js
//
// Uses the service_role key (server-side only, bypasses RLS) — never
// expose that key to the browser.

const { loadEnvConfig } = require("@next/env");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");

loadEnvConfig(process.cwd());

// ---- Edit this before running ----------------------------------------
const USER = {
  email: "mohamed@gmail.com",
  password: "mohamed123",
  full_name: "Mohamed",
  role: "field_manager",
  country: "Angola",
};
// ------------------------------------------------------------------------

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env / .env.local"
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const password_hash = await bcrypt.hash(USER.password, 12);

  const { data, error } = await supabase
    .from("Angola_field_cash_users")
    .insert({
      email: USER.email,
      password_hash,
      full_name: USER.full_name,
      role: USER.role,
      country: USER.country,
    })
    .select("id, email, full_name, role, country, created_at")
    .single();

  if (error) {
    throw error;
  }

  console.log("User created:", data);
}

main().catch((err) => {
  console.error("Failed to create user:", err.message);
  process.exit(1);
});
