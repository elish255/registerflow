import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PAYMENT_AMOUNT = 14500;
export const PAYMENT_CURRENCY = "TZS";

const MOBILIPA_BASE = "https://api.mobilipa.store";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("255")) return digits;
  if (digits.startsWith("0")) return `255${digits.slice(1)}`;
  return `255${digits}`;
}

/** Sign in with a username instead of an email address. */
export const loginWithUsername = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; password: string }) => {
    if (!input?.username?.trim() || !input?.password) {
      throw new Error("Weka username na password.");
    }
    return { username: input.username.trim(), password: input.password };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", data.username)
      .maybeSingle();

    if (!profile) throw new Error("Username au password si sahihi.");

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    const email = userRes?.user?.email;
    if (!email) throw new Error("Username au password si sahihi.");

    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const anon = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data: signIn, error } = await anon.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (error || !signIn.session) throw new Error("Username au password si sahihi.");

    return {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    };
  });

/** Create a Mobilipa order and trigger the USSD push to the customer's phone. */
export const startPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string }) => {
    const digits = (input?.phone ?? "").replace(/\D/g, "");
    if (digits.length < 9) throw new Error("Namba ya simu si sahihi.");
    return { phone: digits };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const msisdn = normalizePhone(data.phone);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", userId)
      .maybeSingle();

    const res = await fetch(`${MOBILIPA_BASE}/v1/payment/create_order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env["MOBILIPA_API_KEY"]!,
      },
      body: JSON.stringify({
        buyer_email: (claims as { email?: string })?.email ?? "buyer@kozenasite.site",
        buyer_name: profile?.full_name || profile?.username || "KOZENA Member",
        buyer_phone: msisdn,
        amount: PAYMENT_AMOUNT,
        currency: PAYMENT_CURRENCY,
      }),
    });

    const json = (await res.json().catch(() => null)) as
      | { status?: string; message?: string; data?: Record<string, unknown> }
      | null;

    if (!res.ok || json?.status !== "success" || !json?.data) {
      throw new Error(json?.message ?? "Imeshindikana kutuma ombi la malipo. Jaribu tena.");
    }

    const orderId = String(json.data["order_id"] ?? "");
    const reference = json.data["reference"] ? String(json.data["reference"]) : null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("payments").insert({
      user_id: userId,
      phone: msisdn,
      amount: PAYMENT_AMOUNT,
      currency: PAYMENT_CURRENCY,
      order_id: orderId,
      reference,
      status: "PENDING",
    });

    return {
      order_id: orderId,
      reference,
      message: json.message ?? "Push USSD imetumwa kwenye simu yako.",
    };
  });

/** Poll Mobilipa for the order status and unlock the dashboard when it completes. */
export const checkPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => {
    if (!input?.orderId) throw new Error("Order id inahitajika.");
    return { orderId: input.orderId };
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const res = await fetch(`${MOBILIPA_BASE}/v1/payment/check_status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env["MOBILIPA_API_KEY"]!,
      },
      body: JSON.stringify({ order_id: data.orderId }),
    });

    const json = (await res.json().catch(() => null)) as
      | { status?: string; message?: string; data?: Record<string, unknown> }
      | null;

    const paymentStatus = String(json?.data?.["payment_status"] ?? "PENDING").toUpperCase();
    const transid = json?.data?.["transid"] ? String(json.data["transid"]) : null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("payments")
      .update({ status: paymentStatus, transid })
      .eq("order_id", data.orderId)
      .eq("user_id", userId);

    if (paymentStatus === "COMPLETED") {
      await supabaseAdmin.from("profiles").update({ has_paid: true }).eq("id", userId);
    }

    return { payment_status: paymentStatus, transid, message: json?.message ?? null };
  });
