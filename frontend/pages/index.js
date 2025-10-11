import { useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { token, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [token, loading, router]);

  return (
    <Layout>
      <p className="text-center text-sm text-slate-500">Redirecting...</p>
    </Layout>
  );
}
