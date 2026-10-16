import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { axios } from "../services/api";
import { useAuth } from "../components/auth/AuthProvider";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const requestedPath = (
    location.state as { from?: { pathname?: string } } | null
  )?.from?.pathname;

  const destination =
    requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
      ? requestedPath
      : "/";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(
        axios.isAxiosError(requestError)
          ? requestError.response?.data?.message ||
              "Unable to sign in. Please try again."
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame
      title="Welcome back"
      subtitle="Sign in to your NetPulse workspace"
    >
      <form
        onSubmit={(event) => void submit(event)}
        className="space-y-4"
      >
        <label className="block text-sm text-slate-300">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-sky-500"
          />
        </label>

        <label className="block text-sm text-slate-300">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-sky-500"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-rose-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-sky-600 px-4 py-2.5 font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-400">
        New to NetPulse?{" "}
        <Link
          className="text-sky-300 hover:text-sky-200"
          to="/register"
        >
          Create an account
        </Link>
      </p>
    </AuthFrame>
  );
}

export function AuthFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#070e19] px-4 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-7 shadow-xl">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl border border-sky-500/30 bg-sky-500/10 font-bold text-sky-300">
            NP
          </div>

          <h1 className="text-2xl font-bold text-white">
            {title}
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            {subtitle}
          </p>
        </div>

        {children}
      </section>
    </main>
  );
}
