import { createClient } from "npm:@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(supabaseUrl, serviceRoleKey);
const encoder = new TextEncoder();
const TOKEN_PREFIX = "pnd_admin_v1.";
const TOKEN_TTL_SECONDS = 8 * 60 * 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function base64url(input: Uint8Array | string) {
  const bytes = typeof input === "string" ? encoder.encode(input) : input;
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64url(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - input.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sha256(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(serviceRoleKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

async function createToken() {
  const payload = base64url(JSON.stringify({
    sub: "admin",
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  }));
  return TOKEN_PREFIX + payload + "." + await hmac(payload);
}

async function isAuthorized(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token.startsWith(TOKEN_PREFIX)) return false;
  const raw = token.slice(TOKEN_PREFIX.length);
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return false;
  const expected = await hmac(payload);
  if (signature.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  if (mismatch !== 0) return false;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64url(payload)));
    return parsed.sub === "admin" && Number(parsed.exp) > Math.floor(Date.now() / 1000);
  } catch (_) {
    return false;
  }
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function login(password: string) {
  const { data, error } = await db
    .from("site_settings")
    .select("value")
    .eq("key", "admin_password_hash")
    .maybeSingle();
  if (error || !data?.value) return response({ error: "Admin password is not configured." }, 500);
  const inputHash = await sha256(password.trim());
  if (inputHash !== data.value) return response({ error: "Incorrect password." }, 401);
  return response({ token: await createToken(), expiresIn: TOKEN_TTL_SECONDS });
}

async function handleAuthorized(action: string, payload: Record<string, unknown>) {
  if (action === "projects.list") {
    const { data, error } = await db.from("projects").select("*").order("created_at", { ascending: false });
    return error ? response({ error: error.message }, 500) : response({ data: data || [] });
  }
  if (action === "projects.upsert") {
    const record = payload.record;
    const { data, error } = await db.from("projects").upsert(record, { onConflict: "id" }).select().single();
    return error ? response({ error: error.message }, 400) : response({ data });
  }
  if (action === "projects.delete") {
    const { error } = await db.from("projects").delete().eq("id", String(payload.id));
    return error ? response({ error: error.message }, 400) : response({ ok: true });
  }
  if (action === "offers.list") {
    const { data, error } = await db.from("offers").select("*").order("created_at", { ascending: false });
    return error ? response({ error: error.message }, 500) : response({ data: data || [] });
  }
  if (action === "offers.upsert") {
    const { data, error } = await db.from("offers").upsert(payload.record, { onConflict: "id" }).select().single();
    return error ? response({ error: error.message }, 400) : response({ data });
  }
  if (action === "offers.delete") {
    const { error } = await db.from("offers").delete().eq("id", String(payload.id));
    return error ? response({ error: error.message }, 400) : response({ ok: true });
  }
  if (action === "contact.list") {
    const { data, error } = await db.from("public_contact_settings").select("key,value").limit(20);
    return error ? response({ error: error.message }, 500) : response({ data: data || [] });
  }
  if (action === "contact.upsert") {
    const record = payload.record;
    const { data, error } = await db.from("public_contact_settings").upsert(record, { onConflict: "key" }).select().single();
    return error ? response({ error: error.message }, 400) : response({ data });
  }
  return response({ error: "Unknown action." }, 400);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed." }, 405);
  try {
    const payload = await req.json();
    if (payload.action === "login") return await login(String(payload.password || ""));
    if (!(await isAuthorized(req))) return response({ error: "Unauthorized." }, 401);
    return await handleAuthorized(String(payload.action || ""), payload);
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Request failed." }, 500);
  }
});
