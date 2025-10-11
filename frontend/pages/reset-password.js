import { useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import { apiRequest } from "../utils/api";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });

      setStatus(response.message);
      setToken("");
      setPassword("");
    } catch (err) {
      setError(err.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Reset password">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="token">
            Reset token
          </label>
          <input
            id="token"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="password">
            New password
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}
        {status ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {status}
          </p>
        ) : null}

        <button
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={loading}
        >
          {loading ? "Updating password..." : "Reset password"}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/login" className="font-semibold text-blue-600 transition hover:text-blue-700">
          Return to login
        </Link>
        <Link href="/forgot-password" className="font-semibold text-blue-600 transition hover:text-blue-700">
          Need a token?
        </Link>
      </div>
    </Layout>
  );
}
