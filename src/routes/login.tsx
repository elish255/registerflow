import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { loginWithUsername } from "@/lib/kozena.functions";
import logo from "@/assets/login-logo.png.asset.json";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Ingia — KOZENA SITE" },
      {
        name: "description",
        content: "Ingia kwenye akaunti yako ya KOZENA SITE kwa username na password kisha ulipie.",
      },
      { property: "og:title", content: "Ingia — KOZENA SITE" },
      { property: "og:description", content: "Ingia kwa username na password ya KOZENA SITE." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const signIn = useServerFn(loginWithUsername);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/payment" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await signIn({ data: { username, password } });
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      if (sessionError) throw sessionError;
      navigate({ to: "/payment" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Imeshindikana kuingia.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="k-auth-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="k-card grid grid-cols-1 lg:grid-cols-12">
          <aside className="k-brand-side hidden p-10 text-white lg:col-span-5 lg:flex lg:flex-col">
            <h2 className="text-3xl font-bold leading-tight">
              Welcome
              <br />
              Back.
            </h2>
            <p className="mt-3 text-sm text-white/75">
              Ingia kwenye akaunti yako na endelea na malipo yako.
            </p>
            <img src={logo.url} alt="KOZENA SITE" className="mt-auto h-10 w-auto object-contain" />
          </aside>

          <section className="p-6 md:p-10 lg:col-span-7">
            <h1 className="text-2xl font-bold text-k-slate-900">Login</h1>
            <p className="mt-1 text-sm text-k-slate-500">
              Weka taarifa zako kufikia akaunti yako.
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-k-red-300 bg-k-red-50 px-4 py-3 text-sm text-k-red-900">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-k-slate-500">Username</span>
                <input
                  className="k-field focus:k-field-focus"
                  placeholder="e.g. user_01"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.trim())}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-k-slate-500">Password</span>
                <input
                  type="password"
                  className="k-field focus:k-field-focus"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <button type="submit" disabled={loading} className="k-btn hover:bg-k-indigo-dark disabled:opacity-60">
                {loading ? "Inaingia..." : "Sign In"}
              </button>

              <p className="text-center text-sm text-k-slate-500">
                Huna akaunti?{" "}
                <Link to="/" className="font-bold text-k-indigo">
                  Jisajili hapa
                </Link>
              </p>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
