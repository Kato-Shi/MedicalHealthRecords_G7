import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formValues, setFormValues] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ...formValues,
          role: "patient",
        }),
      });

      login(response.data.user, response.data.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Unable to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Create account">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            name="username"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
            value={formValues.username}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
            value={formValues.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
            value={formValues.password}
            onChange={handleChange}
            required
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <button
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>Already have an account?</span>
        <Link href="/login" className="font-semibold text-blue-600 transition hover:text-blue-700">
          Login
        </Link>
      </div>
    </Layout>
  );
}
