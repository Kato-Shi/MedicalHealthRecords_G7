import Layout from "../components/Layout";
import Link from "next/link";

export default function MedicalRecordsPlaceholder() {
  return (
    <Layout title="Medical records">
      <div className="mx-auto max-w-3xl space-y-4 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Medical records</h1>
        <p className="text-sm text-slate-600">
          Record review and updates will be added next. If you need to update a record today, please contact staff or a
          clinician to document on your behalf.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Back to dashboard
        </Link>
      </div>
    </Layout>
  );
}
