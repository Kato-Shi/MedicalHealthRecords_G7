import Layout from "../components/Layout";
import { useRouter } from "next/router";

export default function AppointmentsPlaceholder() {
  const router = useRouter();

  return (
    <Layout title="Appointments">
      <div className="mx-auto max-w-3xl space-y-4 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Appointments workspace</h1>
        <p className="text-sm text-slate-600">
          Scheduling and rescheduling will live here soon. For now, use the dashboard shortcuts to view your next
          appointment, or ask staff to book on your behalf.
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Back to dashboard
        </button>
      </div>
    </Layout>
  );
}
