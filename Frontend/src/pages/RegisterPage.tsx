import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { axios } from "../services/api";
import { useAuth } from "../components/auth/AuthProvider";
import { AuthFrame } from "./LoginPage";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail) {
      setError("Please enter your name and email address.");
      return;
    }

    if (password.length < 12 || password.length > 128) {
      setError("Password must contain 12–128 characters.");
      return;
    }

    setSubmitting(true);

    try {
      await register(trimmedEmail, trimmedName, password);
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(
        axios.isAxiosError(requestError)
          ? requestError.response?.data?.message ||
              "Unable to create your account. Please try again."
          : "Unable to create your account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame
      title="Create your account"
      subtitle="Start monitoring with NetPulse"
    >
      <form
        onSubmit={(event) => void submit(event)}
        className="space-y-4"
      >
        <label className="block text-sm text-slate-300">
          Display name
          <input
            type="text"
            autoComplete="name"
            required
            minLength={1}
            maxLength={80}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-sky-500"
          />
        </label>

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
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-sky-500"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Use at least 12 characters.
          </span>
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
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-400">
        Already registered?{" "}
        <Link
          className="text-sky-300 hover:text-sky-200"
          to="/login"
        >
          Sign in
        </Link>
      </p>
    </AuthFrame>
  );
}
