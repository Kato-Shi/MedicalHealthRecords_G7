import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";

const statusStyles = {
  scheduled: "bg-blue-50 text-blue-700 ring-blue-100",
  pending: "bg-amber-50 text-amber-800 ring-amber-100",
  confirmed: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  reschedule_requested: "bg-orange-50 text-orange-800 ring-orange-100",
  completed: "bg-slate-100 text-slate-700 ring-slate-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-100",
};

function StatusBadge({ status }) {
  const style = statusStyles[status] || "bg-slate-100 text-slate-700 ring-slate-200";
  const label = status?.replace(/_/g, " ") || "unknown";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${style}`}>{label}</span>;
}

export default function AppointmentsPage() {
  const router = useRouter();
  const { token, user, loading } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    appointmentDate: "",
    patientId: "",
    doctorId: "",
    reason: "",
    notes: "",
    location: "Virtual visit",
    status: "scheduled",
  });
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [error, setError] = useState("");
  const formRef = useRef(null);

  const isPatient = user?.role === "patient";
  const isDoctor = user?.role === "doctor";
  const isStaff = user?.role === "staff" || user?.role === "manager" || user?.role === "admin";

  useEffect(() => {
    if (loading) return;
    if (!token) {
      router.replace("/login");
    }
  }, [loading, token, router]);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      setLoadingData(true);
      setError("");
      try {
        const requests = [
          apiRequest("/appointments", { method: "GET", token }),
          apiRequest("/directory/doctors", { method: "GET", token }),
        ];

        // Patients/clinical roles can list patients; patients get their own profile back
        requests.push(
          apiRequest("/patients", { method: "GET", token }).catch((err) => {
            // Patients without a profile may hit 404; surface message but keep rendering
            if (err.status === 404) {
              return { data: { patients: [] } };
            }
            throw err;
          }),
        );

        const [appointmentsRes, doctorsRes, patientsRes] = await Promise.all(requests);
        setAppointments(appointmentsRes?.data?.appointments || []);
        setDoctors(doctorsRes?.data?.doctors || []);

        const fetchedPatients = patientsRes?.data?.patients || [];
        setPatients(fetchedPatients);
        if (isPatient) {
          if (fetchedPatients[0]?.primaryDoctorId) {
            setForm((prev) => ({ ...prev, doctorId: fetchedPatients[0].primaryDoctorId }));
          }
        }
      } catch (err) {
        setError(err.message || "Unable to load appointments");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [token, isPatient]);

  const nextAppointment = useMemo(() => {
    const future = appointments
      .filter((appt) => {
        if (appt.status === "cancelled") return false;
        const date = new Date(appt.appointmentDate);
        return !Number.isNaN(date.getTime()) && date.getTime() >= Date.now();
      })
      .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
    return future[0] || null;
  }, [appointments]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setActionMessage("");
    setError("");

    try {
      const payload = {
        appointmentDate: form.appointmentDate ? new Date(form.appointmentDate).toISOString() : "",
        reason: form.reason || undefined,
        notes: form.notes || undefined,
        location: form.location || undefined,
      };

      if (form.status) {
        payload.status = form.status;
      }

      if (!isPatient && form.patientId) {
        payload.patientId = form.patientId;
      }

      if (form.doctorId) {
        payload.doctorId = form.doctorId;
      }

      const response = await apiRequest("/appointments", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });

      setAppointments((prev) => [response.data.appointment, ...prev]);
      setActionMessage("Appointment booked successfully.");
      setForm((prev) => ({
        ...prev,
        appointmentDate: "",
        reason: "",
        notes: "",
        location: prev.location || "Virtual visit",
      }));
    } catch (err) {
      setError(err.message || "Unable to create appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (appointmentId, updates) => {
    if (!token) return;
    setActionMessage("");
    setError("");
    try {
      const response = await apiRequest(`/appointments/${appointmentId}`, {
        method: "PUT",
        token,
        body: JSON.stringify(updates),
      });
      setAppointments((prev) => prev.map((appt) => (appt.id === appointmentId ? response.data.appointment : appt)));
      setActionMessage(response.message || "Appointment updated");
    } catch (err) {
      setError(err.message || "Unable to update appointment");
    }
  };

  const handleDelete = async (appointmentId) => {
    if (!token) return;
    setActionMessage("");
    setError("");
    try {
      await apiRequest(`/appointments/${appointmentId}`, { method: "DELETE", token });
      setAppointments((prev) => prev.filter((appt) => appt.id !== appointmentId));
      setActionMessage("Appointment cancelled");
    } catch (err) {
      setError(err.message || "Unable to cancel appointment");
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Layout title="Appointments" contentClassName="max-w-5xl">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Next steps</p>
              <h2 className="text-2xl font-bold text-slate-900">Your upcoming appointment</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={scrollToForm}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Book appointment
              </button>
              <button
                type="button"
                onClick={() => router.push("/medical-records")}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 hover:bg-blue-50"
              >
                View medical record
              </button>
            </div>
          </div>

          {nextAppointment ? (
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-500">{new Date(nextAppointment.appointmentDate).toLocaleString()}</p>
                <p className="text-xl font-bold text-slate-900">
                  {nextAppointment.doctor?.firstName || nextAppointment.doctor?.username}
                  {nextAppointment.doctor?.lastName ? ` ${nextAppointment.doctor.lastName}` : ""}
                </p>
                <p className="text-sm text-slate-600">{nextAppointment.location || "TBD"}</p>
                <p className="text-sm text-slate-500">{nextAppointment.reason || "No reason provided"}</p>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <StatusBadge status={nextAppointment.status} />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdate(nextAppointment.id, {
                        status: "reschedule_requested",
                      })
                    }
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-100 hover:bg-amber-50"
                  >
                    Request reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(nextAppointment.id)}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100 hover:bg-rose-50"
                  >
                    Cancel
                  </button>
                  <a
                    href={`https://calendar.google.com/calendar/r/eventedit?text=Appointment&dates=${encodeURIComponent(
                      new Date(nextAppointment.appointmentDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z",
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    Add to calendar
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-left shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xl font-semibold text-slate-900">You have no upcoming appointments.</p>
                <p className="text-sm text-slate-600">Book your next visit to reserve a slot.</p>
              </div>
              <button
                type="button"
                onClick={scrollToForm}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Book an appointment
              </button>
            </div>
          )}
        </div>

        <div ref={formRef} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Book an appointment</h2>
              <p className="text-sm text-slate-600">Fill in the date, doctor, and reason. Staff can book on behalf of patients.</p>
            </div>
            {actionMessage ? <p className="text-sm font-semibold text-emerald-700">{actionMessage}</p> : null}
            {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
          </div>

          <form onSubmit={handleCreate} className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Appointment date/time</label>
              <input
                type="datetime-local"
                name="appointmentDate"
                value={form.appointmentDate}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Doctor</label>
              <select
                name="doctorId"
                value={form.doctorId}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select a doctor</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {(doc.firstName || doc.username) + (doc.lastName ? ` ${doc.lastName}` : "")} – {doc.email}
                  </option>
                ))}
              </select>
            </div>

            {isStaff && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Patient</label>
                <select
                  name="patientId"
                  value={form.patientId}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select a patient</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">Leave blank to require the patient to confirm.</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Reason</label>
              <input
                type="text"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder="Follow-up, annual exam, etc."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Add context for the visit"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Location</label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {isStaff && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="reschedule_requested">Reschedule requested</option>
                </select>
                <p className="text-xs text-slate-500">Doctors and patients can request reschedules; staff can confirm.</p>
              </div>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Booking..." : "Book appointment"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-slate-900">All appointments</h2>
            {loadingData ? <p className="text-sm text-slate-600">Loading...</p> : null}
          </div>

          {error && !loadingData ? <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p> : null}

          <div className="mt-4 space-y-3">
            {appointments.length === 0 && !loadingData ? (
              <p className="text-sm text-slate-600">No appointments found.</p>
            ) : null}

            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold text-slate-900">{new Date(appt.appointmentDate).toLocaleString()}</p>
                    <StatusBadge status={appt.status} />
                  </div>
                  <p className="text-sm text-slate-700">
                    Patient: {appt.patient?.firstName} {appt.patient?.lastName}
                  </p>
                  <p className="text-sm text-slate-700">
                    Doctor: {appt.doctor?.firstName || appt.doctor?.username} {appt.doctor?.lastName || ""}
                  </p>
                  <p className="text-xs text-slate-500">{appt.reason || "No reason provided"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdate(appt.id, {
                        status: appt.status === "reschedule_requested" ? "pending" : "reschedule_requested",
                      })
                    }
                    className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-amber-700 ring-1 ring-amber-100 hover:bg-amber-50"
                  >
                    {appt.status === "reschedule_requested" ? "Mark pending" : "Request reschedule"}
                  </button>
                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => handleUpdate(appt.id, { status: "confirmed" })}
                      className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-50"
                    >
                      Confirm
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(appt.id)}
                    className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-100 hover:bg-rose-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
