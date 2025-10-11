import { useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import { apiRequest } from "../utils/api";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const body = {};
      if (identifier.includes("@")) {
        body.email = identifier;
      } else {
        body.username = identifier;
      }

      const response = await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setStatus({
        message: response.message,
        resetToken: response.data?.resetToken,
        expiresAt: response.data?.expiresAt,
      });
      setIdentifier("");
    } catch (err) {
      setError(err.message || "Unable to process request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Forgot password">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="identifier">
            Enter your email or username
          </label>
          <input
            id="identifier"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        {status ? (
          <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
            <p className="font-medium">{status.message}</p>
            {status.resetToken ? (
              <p>
                Demo token: <code className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-xs">{status.resetToken}</code>
              </p>
            ) : null}
            {status.expiresAt ? (
              <p>Token expires at: {new Date(status.expiresAt).toLocaleString()}</p>
            ) : null}
          </div>
        ) : null}

        <button
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={loading}
        >
          {loading ? "Sending instructions..." : "Send reset link"}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/login" className="font-semibold text-blue-600 transition hover:text-blue-700">
          Back to login
        </Link>
        <Link href="/reset-password" className="font-semibold text-blue-600 transition hover:text-blue-700">
          Already have a token?
        </Link>
      </div>
    </Layout>
  );
}
