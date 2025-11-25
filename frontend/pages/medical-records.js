import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";

const clinicalRoles = ["admin", "manager", "staff", "doctor"];

function Card({ title, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function MedicalRecordsPage() {
  const { token, user, loading } = useAuth();
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    title: "",
    visitDate: "",
    description: "",
    diagnosis: "",
    treatmentPlan: "",
    followUpDate: "",
  });
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isClinical = clinicalRoles.includes(user?.role);

  useEffect(() => {
    if (loading || !token) return;

    const fetchRecords = async () => {
      setLoadingData(true);
      setError("");
      try {
        const responses = [apiRequest("/medical-records", { method: "GET", token })];
        if (isClinical) {
          responses.push(apiRequest("/patients", { method: "GET", token }));
          responses.push(apiRequest("/directory/doctors", { method: "GET", token }));
        }

        const [recordRes, patientsRes, doctorsRes] = await Promise.all(responses);
        setRecords(recordRes?.data?.records || []);
        setPatients(patientsRes?.data?.patients || []);
        setDoctors(doctorsRes?.data?.doctors || []);
        if (user?.role === "doctor") {
          setForm((prev) => ({ ...prev, doctorId: user.id }));
        }
      } catch (err) {
        setError(err.message || "Unable to load medical records");
      } finally {
        setLoadingData(false);
      }
    };

    fetchRecords();
  }, [token, isClinical, user?.role, user?.id, loading]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        title: form.title,
        visitDate: form.visitDate || undefined,
        description: form.description || undefined,
        diagnosis: form.diagnosis || undefined,
        treatmentPlan: form.treatmentPlan || undefined,
        followUpDate: form.followUpDate || undefined,
      };

      if (form.patientId) {
        payload.patientId = form.patientId;
      }

      if (form.doctorId) {
        payload.doctorId = form.doctorId;
      }

      const response = await apiRequest("/medical-records", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });

      setRecords((prev) => [response.data.record, ...prev]);
      setMessage("Record saved successfully");
      setForm((prev) => ({
        ...prev,
        title: "",
        visitDate: "",
        description: "",
        diagnosis: "",
        treatmentPlan: "",
        followUpDate: "",
      }));
    } catch (err) {
      setError(err.message || "Unable to save record");
    } finally {
      setSubmitting(false);
    }
  };

  const latestRecord = useMemo(() => records[0] || null, [records]);

  return (
    <Layout title="Medical records" contentClassName="max-w-5xl">
      <div className="space-y-8">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-6 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-emerald-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Clinical history</p>
              <h2 className="text-2xl font-bold text-slate-900">Your medical records</h2>
              <p className="text-sm text-slate-600">Search, review, and add encounters. Patients see only their own records.</p>
            </div>
            {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
            {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Card title="Records" value={records.length} hint="Total available to you" />
            <Card title="Latest title" value={latestRecord?.title || "None"} hint={latestRecord?.diagnosis || "Awaiting docs"} />
            <Card title="Your role" value={user?.role} hint={user?.email} />
          </div>
        </div>

        {isClinical ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add a record</h2>
                <p className="text-sm text-slate-600">Document a new encounter, diagnosis, or treatment plan.</p>
              </div>
              {submitting ? <p className="text-sm text-slate-500">Saving...</p> : null}
            </div>

            <form onSubmit={handleCreate} className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Title</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="Follow-up visit"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Visit date</label>
                <input
                  type="date"
                  name="visitDate"
                  value={form.visitDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Patient</label>
                <select
                  name="patientId"
                  value={form.patientId}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Select patient</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Doctor</label>
                <select
                  name="doctorId"
                  value={form.doctorId}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Select doctor</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {(doc.firstName || doc.username) + (doc.lastName ? ` ${doc.lastName}` : "")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Diagnosis</label>
                <input
                  type="text"
                  name="diagnosis"
                  value={form.diagnosis}
                  onChange={handleChange}
                  placeholder="Hypertension"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Treatment plan</label>
                <textarea
                  name="treatmentPlan"
                  value={form.treatmentPlan}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Lifestyle changes, medication, follow-up"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Follow-up date</label>
                <input
                  type="date"
                  name="followUpDate"
                  value={form.followUpDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Visit summary</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Clinical notes, findings, recommendations"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Saving..." : "Save record"}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Records available to you</h2>
              <p className="text-sm text-slate-600">Patients see their own history; clinicians can browse all assigned records.</p>
            </div>
            {loadingData ? <p className="text-sm text-slate-500">Loading...</p> : null}
          </div>

          {records.length === 0 && !loadingData ? (
            <p className="mt-3 text-sm text-slate-600">No records found.</p>
          ) : null}

          <div className="mt-4 space-y-3">
            {records.map((record) => (
              <div key={record.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm ring-1 ring-slate-100">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{record.title}</p>
                    <p className="text-sm text-slate-600">Visit: {record.visitDate || "Not set"}</p>
                    <p className="text-sm text-slate-600">Patient: {record.patient?.firstName} {record.patient?.lastName}</p>
                    <p className="text-sm text-slate-600">
                      Doctor: {record.doctor?.firstName || record.doctor?.username} {record.doctor?.lastName || ""}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>Created by {record.createdBy?.username || "system"}</p>
                    <p>{new Date(record.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                {record.diagnosis ? <p className="mt-2 text-sm font-semibold text-slate-800">Diagnosis: {record.diagnosis}</p> : null}
                {record.treatmentPlan ? <p className="text-sm text-slate-700">Plan: {record.treatmentPlan}</p> : null}
                {record.description ? <p className="text-sm text-slate-600">Notes: {record.description}</p> : null}
                {record.followUpDate ? <p className="text-xs text-slate-500">Follow-up: {record.followUpDate}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
