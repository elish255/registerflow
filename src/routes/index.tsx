import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/login-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jisajili — KOZENA SITE" },
      {
        name: "description",
        content:
          "Fungua akaunti yako ya KOZENA SITE kwa dakika moja, kisha lipia kwa USSD Push moja kwa moja kwenye simu yako.",
      },
      { property: "og:title", content: "Jisajili — KOZENA SITE" },
      {
        property: "og:description",
        content: "Fungua akaunti yako ya KOZENA SITE kisha lipia kwa USSD Push.",
      },
    ],
  }),
  component: RegisterPage,
});

const COUNTRIES = [
  { value: "tz", label: "🇹🇿 Tanzania" },
  { value: "ke", label: "🇰🇪 Kenya" },
  { value: "ug", label: "🇺🇬 Uganda" },
  { value: "bi", label: "🇧🇮 Burundi" },
  { value: "cd", label: "🇨🇩 Congo" },
  { value: "zm", label: "🇿🇲 Zambia" },
  { value: "mw", label: "🇲🇼 Malawi" },
  { value: "International", label: "🌍 International" },
];

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    username: "",
    phone: "",
    email: "",
    country: "tz",
    password: "",
    confirm: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/payment" });
    });
  }, [navigate]);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError("Password hazifanani.");
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: form.name,
          username: form.username,
          phone: form.phone,
          country: form.country,
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(
        /duplicate|unique/i.test(signUpError.message)
          ? "Username au email tayari imetumika."
          : signUpError.message,
      );
      return;
    }
    if (!data.session) {
      setError("Akaunti imefunguliwa. Tafadhali ingia.");
      return;
    }
    navigate({ to: "/payment" });
  }

  return (
    <main className="k-auth-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl">
        <div className="k-card grid grid-cols-1 lg:grid-cols-12">
          <aside className="hidden bg-k-dark p-10 text-white lg:col-span-5 lg:flex lg:flex-col">
            <div className="mb-10 inline-flex w-fit rounded-xl bg-white px-3 py-2">
              <img src={logo.url} alt="KOZENA SITE" className="h-8 w-auto object-contain" />
            </div>
            <h2 className="text-2xl font-bold">Join our community</h2>
            <p className="mt-3 text-sm text-white/60">
              Fungua akaunti yako, lipia kwa USSD Push na anza kutumia mfumo mara moja.
            </p>
            <div className="mt-10 space-y-3 text-sm">
              {["Secure Data Encryption", "Instant Account Activation", "Malipo salama kwa simu"].map(
                (t) => (
                  <div key={t} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-k-indigo text-xs">
                      ✓
                    </span>
                    <span>{t}</span>
                  </div>
                ),
              )}
            </div>
            <p className="mt-auto pt-10 text-xs text-white/40">© KOZENA SITE</p>
          </aside>

          <section className="p-6 md:p-10 lg:col-span-7">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-k-slate-900">Create Account</h1>
              <span className="text-xs text-k-slate-500">Hatua 1 kati ya 2</span>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-k-red-300 bg-k-red-50 px-4 py-3 text-sm text-k-red-900">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Full Name">
                <input
                  className="k-field focus:k-field-focus"
                  placeholder="John Alex"
                  required
                  value={form.name}
                  onChange={(e) => set("name")(e.target.value)}
                />
              </Field>
              <Field label="Username">
                <input
                  className="k-field focus:k-field-focus"
                  placeholder="user_01"
                  required
                  value={form.username}
                  onChange={(e) => set("username")(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                />
              </Field>
              <Field label="Phone Number">
                <input
                  className="k-field focus:k-field-focus"
                  placeholder="06XXXXXXXX"
                  inputMode="tel"
                  required
                  value={form.phone}
                  onChange={(e) => set("phone")(e.target.value.replace(/[^0-9+]/g, ""))}
                />
              </Field>
              <Field label="Email Address">
                <input
                  type="email"
                  className="k-field focus:k-field-focus"
                  placeholder="name@mail.com"
                  required
                  value={form.email}
                  onChange={(e) => set("email")(e.target.value)}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Country">
                  <select
                    className="k-field focus:k-field-focus"
                    value={form.country}
                    onChange={(e) => set("country")(e.target.value)}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Password">
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    className="k-field focus:k-field-focus pr-12"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => set("password")(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-k-slate-500"
                  >
                    {showPass ? "Ficha" : "Onyesha"}
                  </button>
                </div>
              </Field>
              <Field label="Confirm Password">
                <input
                  type="password"
                  className="k-field focus:k-field-focus"
                  placeholder="••••••••"
                  required
                  value={form.confirm}
                  onChange={(e) => set("confirm")(e.target.value)}
                />
              </Field>

              <div className="md:col-span-2">
                <button type="submit" disabled={loading} className="k-btn hover:bg-k-indigo-dark disabled:opacity-60">
                  {loading ? "Inasajili..." : "Register"}
                </button>
                <p className="mt-4 text-center text-sm text-k-slate-500">
                  Tayari una akaunti?{" "}
                  <Link to="/login" className="font-bold text-k-indigo">
                    Login
                  </Link>
                </p>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-k-slate-500">{label}</span>
      {children}
    </label>
  );
}
