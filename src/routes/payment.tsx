import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { startPayment, checkPaymentStatus, PAYMENT_AMOUNT } from "@/lib/kozena.functions";

export const Route = createFileRoute("/payment")({
  head: () => ({
    meta: [
      { title: "Lipa — KOZENA SITE" },
      {
        name: "description",
        content:
          "Lipia ada ya KOZENA SITE kwa USSD Push. Weka namba yako ya simu na thibitisha malipo kwenye simu.",
      },
      { property: "og:title", content: "Lipa — KOZENA SITE" },
      { property: "og:description", content: "Lipia kwa USSD Push moja kwa moja kwenye simu yako." },
    ],
  }),
  component: PaymentPage,
});

const OPERATORS = [
  {
    id: "mpesa",
    name: "M-Pesa",
    ussd: "*150*00#",
    steps: [
      "Bonyeza *150*00#",
      "Chagua Lipa kwa M-PESA",
      "Chagua Weka Namba ya Kampuni",
      "Weka M-PESA LIPA NAMBA: 354136248",
      "Weka kiasi 14,500 TZS",
      "Weka namba ya siri",
    ],
  },
  {
    id: "airtel",
    name: "Airtel Money",
    ussd: "*150*60#",
    steps: [
      "Bonyeza *150*60#",
      "Chagua Lipia Bili",
      "Chagua LIPA KWA SIMU (MITANDAO YOTE)",
      "Chagua LIPA KWA VODA LIPA",
      "Weka kiasi 14,500 TZS",
      "Ingiza kumbukumbu ya malipo: 354136248",
    ],
  },
  {
    id: "halo",
    name: "Halopesa",
    ussd: "*150*88#",
    steps: [
      "Bonyeza *150*88#",
      "Chagua (5) Lipia Bidhaa",
      "Chagua (3) M-PESA",
      "Weka namba ya malipo: 354136248",
      "Weka kiasi 14,500 TZS",
      "Ingiza namba ya siri",
    ],
  },
];

type Phase = "form" | "waiting" | "failed";

function PaymentPage() {
  const navigate = useNavigate();
  const createOrder = useServerFn(startPayment);
  const pollStatus = useServerFn(checkPaymentStatus);

  const [ready, setReady] = useState(false);
  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openOp, setOpenOp] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate({ to: "/login" });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, has_paid")
        .eq("id", data.session.user.id)
        .maybeSingle();
      if (profile?.has_paid) {
        navigate({ to: "/dashboard" });
        return;
      }
      if (profile?.phone) setPhone(profile.phone);
      setReady(true);
    });
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPhase("waiting");
    try {
      const order = await createOrder({ data: { phone } });
      setMessage(order.message);
      let attempts = 0;
      timer.current = setInterval(async () => {
        attempts += 1;
        try {
          const res = await pollStatus({ data: { orderId: order.order_id } });
          if (res.payment_status === "COMPLETED") {
            if (timer.current) clearInterval(timer.current);
            navigate({ to: "/dashboard" });
            return;
          }
          if (["CANCELLED", "USERCANCELLED", "REJECTED"].includes(res.payment_status)) {
            if (timer.current) clearInterval(timer.current);
            setPhase("failed");
            setError("Malipo hayakukamilika. Tafadhali jaribu tena.");
          }
        } catch {
          /* keep polling */
        }
        if (attempts >= 40) {
          if (timer.current) clearInterval(timer.current);
          setPhase("failed");
          setError("Muda umeisha bila kupokea uthibitisho wa malipo. Jaribu tena.");
        }
      }, 4000);
    } catch (err) {
      setPhase("failed");
      setError(err instanceof Error ? err.message : "Imeshindikana kuanzisha malipo.");
    }
  }

  if (!ready) {
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
        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] tracking-wide text-k-green-100">
          MALIPO SALAMA
        </span>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-16 pt-7">
        <div className="mb-6 flex gap-3 rounded-2xl border-[1.5px] border-k-red-300 bg-k-red-50 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-k-red-100 text-k-red-600">
            🛡
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-widest text-k-red-600">LINDA PESA YAKO</h2>
            <p className="mt-1 text-sm leading-relaxed text-k-red-900">
              Lipia kupitia mfumo huu pekee au namba ya dharura ya <strong>KOZENASITE</strong>.
              Malipo nje ya mfumo huu ni batili na hayatakubaliwa.
            </p>
          </div>
        </div>

        <div className="mb-5 flex gap-2">
          <span className="flex items-center gap-2 rounded-full border-[1.5px] border-k-green-800 bg-k-green-800 px-4 py-2 text-[13px] text-white">
            🇹🇿 Tanzania
          </span>
        </div>

        <section className="mb-5 overflow-hidden rounded-3xl border-[1.5px] border-k-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-k-slate-100 px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-k-green-50 text-k-green-700">
              ⚡
            </div>
            <div>
              <h3 className="font-semibold">Tanzania</h3>
              <p className="text-xs text-k-slate-500">Lipia moja kwa moja kwa USSD Push</p>
            </div>
          </div>

          <div className="px-5 py-5">
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-k-green-50 px-4 py-3">
              <span className="text-sm text-k-green-700">Kiasi cha kulipa</span>
              <span className="text-lg font-bold text-k-green-900">
                {PAYMENT_AMOUNT.toLocaleString()} TZS
              </span>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-k-red-300 bg-k-red-50 px-4 py-3 text-sm text-k-red-900">
                {error}
              </div>
            )}

            {phase === "waiting" ? (
              <div className="rounded-2xl border-[1.5px] border-k-slate-200 p-6 text-center">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-k-green-100 border-t-k-green-700" />
                <p className="font-semibold text-k-green-900">Subiri uthibitisho...</p>
                <p className="mt-1 text-sm text-k-slate-500">
                  {message ?? "Push USSD imetumwa kwenye simu yako."} Ingiza namba yako ya siri
                  kuthibitisha malipo.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit}>
                <label className="mb-1 block text-xs font-bold text-k-slate-500" htmlFor="tz-phone">
                  Namba ya simu
                </label>
                <div className="mb-4 flex items-center overflow-hidden rounded-xl border-[1.5px] border-k-slate-200 bg-k-slate-50">
                  <span className="border-r border-k-slate-200 px-3 py-3 text-sm text-k-slate-500">
                    🇹🇿 +255
                  </span>
                  <input
                    id="tz-phone"
                    type="tel"
                    required
                    maxLength={12}
                    placeholder="06XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-transparent px-3 py-3 text-sm outline-none"
                  />
                </div>
                <button type="submit" className="k-btn-green hover:opacity-90">
                  🔒 LIPA SASA
                </button>
              </form>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border-[1.5px] border-k-slate-200 bg-white">
          <div className="border-b border-k-slate-100 px-5 py-4">
            <h3 className="font-semibold">Njia nyingine za kulipia</h3>
            <p className="text-xs text-k-slate-500">Tumia LIPA NAMBA kama push haijafika</p>
          </div>
          {OPERATORS.map((op) => (
            <div key={op.id} className="border-b border-k-slate-100 last:border-0">
              <button
                type="button"
                onClick={() => setOpenOp((c) => (c === op.id ? null : op.id))}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span>
                  <span className="block text-sm font-semibold">{op.name}</span>
                  <span className="block text-xs text-k-slate-500">{op.ussd}</span>
                </span>
                <span className="text-k-slate-500">{openOp === op.id ? "▲" : "▼"}</span>
              </button>
              {openOp === op.id && (
                <ol className="space-y-2 bg-k-slate-50 px-5 py-4 text-sm">
                  {op.steps.map((s, i) => (
                    <li key={s} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-k-green-100 text-xs font-bold text-k-green-800">
                        {i + 1}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                  <li className="pt-2 text-xs text-k-slate-500">
                    Jina la Biashara: <strong>KOZENA SITE</strong>
                  </li>
                </ol>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
