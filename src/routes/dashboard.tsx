import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — KOZENA SITE" },
      {
        name: "description",
        content: "Dashboard ya mwanachama wa KOZENA SITE: hali ya malipo na historia ya miamala.",
      },
      { property: "og:title", content: "Dashboard — KOZENA SITE" },
      { property: "og:description", content: "Angalia hali ya akaunti na malipo yako." },
    ],
  }),
  component: DashboardPage,
});

type Profile = { full_name: string; username: string; phone: string; has_paid: boolean };
type Payment = {
  id: string;
  amount: number;
  currency: string;
  phone: string;
  status: string;
  reference: string | null;
  created_at: string;
};

function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        navigate({ to: "/login" });
        return;
      }
      const uid = sessionData.session.user.id;
      const [{ data: p }, { data: pay }] = await Promise.all([
        supabase.from("profiles").select("full_name, username, phone, has_paid").eq("id", uid).maybeSingle(),
        supabase
          .from("payments")
          .select("id, amount, currency, phone, status, reference, created_at")
          .order("created_at", { ascending: false }),
      ]);
      if (!p?.has_paid) {
        navigate({ to: "/payment" });
        return;
      }
      setProfile(p as Profile);
      setPayments((pay ?? []) as Payment[]);
      setLoading(false);
    })();
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-k-slate-50 font-jost text-k-slate-500">
        Inapakia...
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-k-slate-50 font-jost text-k-slate-800">
      <header className="flex items-center justify-between bg-k-green-900 px-6 py-4">
        <span className="text-lg font-extrabold tracking-tight text-white">
          KOZENA <span className="text-k-amber-400">SITE</span>
        </span>
        <button
          onClick={signOut}
          className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white"
        >
          Toka
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        <h1 className="text-2xl font-bold text-k-slate-900">
          Karibu, {profile?.full_name || profile?.username}
        </h1>
        <p className="mt-1 text-sm text-k-slate-500">Akaunti yako imeanzishwa na malipo yamethibitishwa.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Hali ya akaunti" value="ACTIVE" tone="green" />
          <Stat label="Username" value={profile?.username ?? "-"} />
          <Stat label="Simu" value={profile?.phone || "-"} />
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border-[1.5px] border-k-slate-200 bg-white">
          <div className="border-b border-k-slate-100 px-5 py-4">
            <h2 className="font-semibold">Historia ya malipo</h2>
          </div>
          {payments.length === 0 ? (
            <p className="px-5 py-6 text-sm text-k-slate-500">Hakuna malipo bado.</p>
          ) : (
            <ul>
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between border-b border-k-slate-100 px-5 py-4 text-sm last:border-0"
                >
                  <div>
                    <div className="font-semibold">
                      {Number(p.amount).toLocaleString()} {p.currency}
                    </div>
                    <div className="text-xs text-k-slate-500">
                      {p.phone} · {new Date(p.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      p.status === "COMPLETED"
                        ? "bg-k-green-100 text-k-green-800"
                        : "bg-k-amber-100 text-k-amber-500"
                    }`}
                  >
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" }) {
  return (
    <div className="rounded-2xl border-[1.5px] border-k-slate-200 bg-white px-5 py-4">
      <div className="text-xs text-k-slate-500">{label}</div>
      <div
        className={`mt-1 text-lg font-bold ${tone === "green" ? "text-k-green-700" : "text-k-slate-900"}`}
      >
        {value}
      </div>
    </div>
  );
}
