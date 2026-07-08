import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Verifies credentials against Angola_field_cash_users (service_role only,
// bcrypt-hashed passwords), then mints a real Supabase Auth session so the
// rest of the app (middleware + RLS policies) keeps working unchanged.
export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}));

  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: account } = await admin
    .from("Angola_field_cash_users")
    .select("email, password_hash, is_active")
    .eq("email", email)
    .maybeSingle();

  if (!account || !account.is_active) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, account.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
  }

  // Auto-provisions the matching Supabase Auth user on first login.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: account.email,
  });

  if (linkError || !link?.properties?.hashed_token) {
    return NextResponse.json({ error: "Connexion impossible." }, { status: 500 });
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as any)
          );
        },
      },
    }
  );

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: link.properties.hashed_token,
  });

  if (verifyError) {
    return NextResponse.json({ error: "Connexion impossible." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
