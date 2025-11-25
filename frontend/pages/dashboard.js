import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";

export default function DashboardPage() {
  const router = useRouter();
  const { token, user, setUser, loading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [adminStatistics, setAdminStatistics] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminError, setAdminError] = useState(null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [staffPatients, setStaffPatients] = useState([]);
  const [staffAppointments, setStaffAppointments] = useState([]);
  const [staffError, setStaffError] = useState(null);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [roleAppointments, setRoleAppointments] = useState([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [doctorDirectory, setDoctorDirectory] = useState([]);
  const [doctorMessage, setDoctorMessage] = useState(null);
  const [doctorError, setDoctorError] = useState(null);
  const [doctorForm, setDoctorForm] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [doctorAssignments, setDoctorAssignments] = useState({});

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!token) {
      router.replace("/login");
    }
  }, [token, loading, router]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        return;
      }

      setIsLoadingProfile(true);
      setError(null);

      try {
        const response = await apiRequest("/auth/profile", {
          method: "GET",
          token,
        });

        setProfile(response.data);
        setUser(response.data.user);
      } catch (err) {
        setError(err.message || "Unable to load profile");
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [token, setUser]);

  useEffect(() => {
    const isAdmin = user?.role === "admin";

    if (!token || !isAdmin) {
      return;
    }

    const fetchAdminInsights = async () => {
      setIsLoadingAdmin(true);
      setAdminError(null);

      try {
        const [dashboardResponse, usersResponse] = await Promise.all([
          apiRequest("/admin/dashboard", {
            method: "GET",
            token,
          }),
          apiRequest("/admin/users", {
            method: "GET",
            token,
          }),
        ]);

        setAdminStatistics(dashboardResponse.data.statistics);
        setAdminUsers(usersResponse.data.users || []);
      } catch (err) {
        setAdminError(err.message || "Unable to load admin analytics");
      } finally {
        setIsLoadingAdmin(false);
      }
    };

    fetchAdminInsights();
  }, [token, user?.role]);

  useEffect(() => {
    if (!token || (user?.role !== "patient" && user?.role !== "doctor")) {
      return;
    }

    const fetchAppointments = async () => {
      setIsLoadingAppointments(true);
      try {
        const response = await apiRequest("/appointments", {
          method: "GET",
          token,
        });
        setRoleAppointments(response.data?.appointments || []);
      } catch (err) {
        setError(err.message || "Unable to load appointments");
      } finally {
        setIsLoadingAppointments(false);
      }
    };

    fetchAppointments();
  }, [token, user?.role]);

  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";
  const isDoctor = user?.role === "doctor";
  const isPatient = user?.role === "patient";

  const parseDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const fullName = profile?.patientProfile
    ? `${profile.patientProfile.firstName} ${profile.patientProfile.lastName}`.trim()
    : user?.username;

  const roleBreakdownEntries = adminStatistics?.roleBreakdown
    ? Object.entries(adminStatistics.roleBreakdown).sort((a, b) => b[1] - a[1])
    : [];

  const appointmentBreakdown = adminStatistics?.appointmentStatusBreakdown || {};
  const pendingOrReschedule =
    (appointmentBreakdown.pending || 0) + (appointmentBreakdown.reschedule_requested || 0);

  const recentUsers = adminUsers.slice(0, 6);

  const formatDate = (value) => {
    if (!value) return "—";
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch (err) {
      return value;
    }
  };

  useEffect(() => {
    if (!token || !isStaff) {
      return;
    }

    const fetchStaffOverview = async () => {
      setIsLoadingStaff(true);
      setStaffError(null);

      try {
        const [patientsResponse, appointmentsResponse] = await Promise.all([
          apiRequest("/patients", {
            method: "GET",
            token,
          }),
          apiRequest("/appointments", {
            method: "GET",
            token,
          }),
        ]);

        setStaffPatients(patientsResponse.data?.patients || []);
        setStaffAppointments(appointmentsResponse.data?.appointments || []);
      } catch (err) {
        setStaffError(err.message || "Unable to load staff workspace");
      } finally {
        setIsLoadingStaff(false);
      }
    };

    fetchStaffOverview();
  }, [token, isStaff]);

  useEffect(() => {
    if (!token || !isStaff) {
      return;
    }

    const fetchDoctors = async () => {
      setIsLoadingDoctors(true);
      setDoctorError(null);

      try {
        const response = await apiRequest("/staff/doctors", {
          method: "GET",
          token,
        });
        setDoctorDirectory(response.data?.doctors || []);
      } catch (err) {
        setDoctorError(err.message || "Unable to load doctors");
      } finally {
        setIsLoadingDoctors(false);
      }
    };

    fetchDoctors();
  }, [token, isStaff]);

  if (!token) {
    return null;
  }

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingRoleAppointments = roleAppointments
    .filter((appointment) => {
      const date = parseDate(appointment.appointmentDate);
      return (
        date &&
        date >= now &&
        appointment.status !== "cancelled" &&
        appointment.status !== "completed"
      );
    })
    .sort((a, b) => {
      const aDate = parseDate(a.appointmentDate)?.getTime() ?? 0;
      const bDate = parseDate(b.appointmentDate)?.getTime() ?? 0;
      return aDate - bDate;
    });

  const nextAppointment = isPatient ? upcomingRoleAppointments[0] : null;
  const doctorUpcomingAppointments = isDoctor ? upcomingRoleAppointments : [];
  const doctorNextAppointment = isDoctor ? doctorUpcomingAppointments[0] : null;
  const doctorTodayAppointments = doctorUpcomingAppointments.filter((appointment) => {
    const date = parseDate(appointment.appointmentDate);
    return date && date.toDateString() === now.toDateString();
  });
  const doctorPendingAppointments = doctorUpcomingAppointments.filter(
    (appointment) => appointment.status === "pending",
  );
  const doctorRescheduleRequests = doctorUpcomingAppointments.filter(
    (appointment) => appointment.status === "reschedule_requested",
  );

  const staffScheduledAppointments = isStaff
    ? staffAppointments.filter((appointment) => appointment.status === "scheduled")
    : [];
  const staffUpcomingWeek = staffScheduledAppointments.filter((appointment) => {
    const date = parseDate(appointment.appointmentDate);
    return date && date >= now && date <= sevenDaysFromNow;
  });
  const staffTodayAppointments = staffScheduledAppointments.filter((appointment) => {
    const date = parseDate(appointment.appointmentDate);
    return date && date.toDateString() === now.toDateString();
  });
  const patientsAwaitingDoctor = staffPatients.filter((patient) => !patient.primaryDoctorId && !patient.primaryDoctor)
    .length;
  const recentStaffPatients = staffPatients.slice(0, 6);
  const nextAppointments = staffUpcomingWeek
    .slice()
    .sort((a, b) => {
      const aDate = parseDate(a.appointmentDate)?.getTime() ?? 0;
      const bDate = parseDate(b.appointmentDate)?.getTime() ?? 0;
      return aDate - bDate;
    })
    .slice(0, 6);

  const getPatientDisplayName = (patient) => {
    if (!patient) {
      return "Unknown patient";
    }

    const composed = `${patient.firstName || ""} ${patient.lastName || ""}`.trim();
    if (composed) {
      return composed;
    }

    if (patient.user?.username) {
      return patient.user.username;
    }

    if (patient.user?.email) {
      return patient.user.email;
    }

    return "Unlinked patient";
  };

  const getDoctorDisplayName = (doctor) => {
    if (!doctor) {
      return "Unassigned";
    }

    const composed = `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim();
    if (composed) {
      return composed;
    }

    if (doctor.username) {
      return doctor.username;
    }

    if (doctor.email) {
      return doctor.email;
    }

    return "Unknown clinician";
  };

  const formatStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "reschedule_requested":
        return "Reschedule requested";
      case "confirmed":
      case "scheduled":
        return "Confirmed";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status || "—";
    }
  };

  const handleDoctorFormChange = (field, value) => {
    setDoctorForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateDoctor = async (event) => {
    event.preventDefault();
    setDoctorError(null);
    setDoctorMessage(null);

    try {
      await apiRequest("/staff/doctors", {
        method: "POST",
        token,
        body: JSON.stringify(doctorForm),
      });

      setDoctorMessage("Doctor registered successfully");
      setDoctorForm({ username: "", firstName: "", lastName: "", email: "", password: "" });

      const refreshed = await apiRequest("/staff/doctors", { method: "GET", token });
      setDoctorDirectory(refreshed.data?.doctors || []);
    } catch (err) {
      setDoctorError(err.message || "Unable to register doctor");
    }
  };

  const handleDeleteDoctor = async (doctorId) => {
    setDoctorError(null);
    setDoctorMessage(null);
    try {
      await apiRequest(`/staff/doctors/${doctorId}`, { method: "DELETE", token });
      setDoctorDirectory((prev) => prev.filter((doc) => doc.id !== doctorId));
      setDoctorMessage("Doctor removed");
    } catch (err) {
      setDoctorError(err.message || "Unable to remove doctor");
    }
  };

  const handleAssignDoctor = async (doctorId) => {
    const patientId = doctorAssignments[doctorId];
    setDoctorError(null);
    setDoctorMessage(null);

    if (!patientId) {
      setDoctorError("Select a patient to assign");
      return;
    }

    try {
      await apiRequest(`/staff/doctors/${doctorId}/assign-patient`, {
        method: "POST",
        token,
        body: JSON.stringify({ patientId }),
      });

      setDoctorMessage("Doctor assigned to patient");
    } catch (err) {
      setDoctorError(err.message || "Unable to assign doctor");
    }
  };

  const buildCalendarLink = (appointment) => {
    if (!appointment?.appointmentDate || !appointment?.doctor) {
      return "#";
    }

    const start = new Date(appointment.appointmentDate);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const toStamp = (date) =>
      `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(
        date.getUTCDate(),
      ).padStart(2, "0")}T${String(date.getUTCHours()).padStart(2, "0")}${String(
        date.getUTCMinutes(),
      ).padStart(2, "0")}00Z`;

    const startStamp = toStamp(start);
    const endStamp = toStamp(end);
    const text = encodeURIComponent(`Appointment with ${getDoctorDisplayName(appointment.doctor)}`);
    const details = encodeURIComponent(appointment.reason || "Healthcare visit");
    const location = encodeURIComponent(appointment.location || "");

    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startStamp}/${endStamp}&details=${details}&location=${location}`;
  };

  return (
    <Layout title="Dashboard" contentClassName={isAdmin || isStaff ? "max-w-6xl" : undefined}>
      {isLoadingProfile ? (
        <p className="text-center text-sm text-slate-500">Loading your dashboard...</p>
      ) : error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
      ) : (
        <div className="space-y-6">
          {(isPatient || isDoctor) && (
            <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Next steps</p>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {isPatient ? "Keep your next visit on track" : "Focus for today"}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {isPatient
                      ? "Review your upcoming appointment and jump into quick actions."
                      : "See the next patient on your schedule and take action."}
                  </p>
                </div>
                {isLoadingAppointments ? (
                  <span className="text-xs font-medium text-slate-500">Syncing your schedule…</span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  {(!isPatient && !isDoctor) || (!nextAppointment && !doctorNextAppointment) ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900">No upcoming appointment</h4>
                          <p className="mt-1 text-slate-600">You have no upcoming appointments.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => router.push("/appointments")}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                        >
                          Book an appointment
                        </button>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const focused = isDoctor ? doctorNextAppointment : nextAppointment;
                      const doctorName = getDoctorDisplayName(focused?.doctor);
                      const appointmentPatient = focused?.patient ? getPatientDisplayName(focused.patient) : null;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-6">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                                {isDoctor ? "Next patient" : "Next appointment"}
                              </p>
                              <h4 className="text-lg font-semibold text-slate-900">
                                {formatDate(focused?.appointmentDate)}
                              </h4>
                              <p className="text-sm text-slate-700">
                                {isDoctor ? appointmentPatient || "Patient" : `With ${doctorName}`}
                              </p>
                              <div className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                {formatStatusLabel(focused?.status)}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => router.push("/appointments")}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                              >
                                Reschedule
                              </button>
                              <button
                                type="button"
                                onClick={() => router.push("/appointments")}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                              <a
                                href={buildCalendarLink(focused)}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                              >
                                Add to calendar
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Quick actions</h4>
                    <span className="text-xs uppercase tracking-wide text-slate-400">Shortcuts</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <button
                      type="button"
                      onClick={() => router.push("/appointments")}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                    >
                      <span>{isPatient ? "Book appointment" : "View schedule"}</span>
                      <span className="text-xs text-slate-500">Go</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/medical-records")}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                    >
                      <span>{isPatient ? "View medical record" : "Review charts"}</span>
                      <span className="text-xs text-slate-500">Open</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">
              Welcome back{fullName ? `, ${fullName}` : ""}!
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Here is the information we currently have on file for you.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Account details</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Username</span>
                <span className="font-medium text-slate-800">{profile?.user?.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Email</span>
                <span className="font-medium text-slate-800">{profile?.user?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Role</span>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold capitalize text-blue-700">
                  {profile?.user?.role}
                </span>
              </div>
            </div>
          </section>

          {profile?.patientProfile ? (
            <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Patient profile</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Full name</span>
                  <span className="font-medium text-slate-800">
                    {profile.patientProfile.firstName} {profile.patientProfile.lastName}
                  </span>
                </div>
                {profile.patientProfile.dateOfBirth ? (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Date of birth</span>
                    <span className="font-medium text-slate-800">{profile.patientProfile.dateOfBirth}</span>
                  </div>
                ) : null}
                {profile.patientProfile.contactNumber ? (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Contact</span>
                    <span className="font-medium text-slate-800">{profile.patientProfile.contactNumber}</span>
                  </div>
                ) : null}
                {profile.patientProfile.address ? (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Address</span>
                    <span className="font-medium text-slate-800">{profile.patientProfile.address}</span>
                  </div>
                ) : null}
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-5 text-sm text-slate-600">
              <h3 className="text-xl font-semibold text-slate-900">No patient profile yet</h3>
              <p className="mt-2">
                Complete your patient intake from the staff portal to unlock appointment scheduling and health record summaries.
              </p>
            </section>
          )}

          {isDoctor ? (
            <section className="space-y-6 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Doctor dashboard</h3>
                  <p className="mt-1 text-sm text-slate-600">Stay ahead of your clinic schedule and patient requests.</p>
                </div>
                {isLoadingAppointments ? (
                  <span className="text-sm font-medium text-slate-500">Refreshing schedule…</span>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Upcoming visits"
                  value={doctorUpcomingAppointments.length}
                  description="Future appointments"
                />
                <MetricCard
                  label="Today"
                  value={doctorTodayAppointments.length}
                  description="Scheduled for today"
                />
                <MetricCard
                  label="Pending"
                  value={doctorPendingAppointments.length}
                  description="Awaiting confirmation"
                />
                <MetricCard
                  label="Reschedule requests"
                  value={doctorRescheduleRequests.length}
                  description="Needs follow-up"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-slate-800">Upcoming appointments</h4>
                  <span className="text-xs uppercase tracking-wide text-slate-400">Next {doctorUpcomingAppointments.length}</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Patient</th>
                        <th className="px-4 py-3">When</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {doctorUpcomingAppointments.length ? (
                        doctorUpcomingAppointments.map((appointment) => (
                          <tr key={appointment.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">
                                {getPatientDisplayName(appointment.patient)}
                              </div>
                              <div className="text-xs text-slate-500">
                                {appointment.patient?.contactNumber || appointment.patient?.email || "No contact listed"}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{formatDate(appointment.appointmentDate)}</td>
                            <td className="px-4 py-3 text-sm font-semibold capitalize text-slate-700">
                              {formatStatusLabel(appointment.status)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">
                            No appointments scheduled yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}

          {isStaff ? (
            <section className="space-y-6 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Care coordination workspace</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Track upcoming visits, ensure patients are connected to clinicians, and monitor your onboarding queue.
                  </p>
                </div>
                {isLoadingStaff ? (
                  <span className="text-sm font-medium text-slate-500">Fetching latest data…</span>
                ) : null}
              </div>

              {staffError ? (
                <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {staffError}
                </p>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      label="Patients supported"
                      value={staffPatients.length}
                      description="Active patient profiles"
                    />
                    <MetricCard
                      label="Visits this week"
                      value={staffUpcomingWeek.length}
                      description="Scheduled within 7 days"
                    />
                    <MetricCard
                      label="Today's check-ins"
                      value={staffTodayAppointments.length}
                      description="Scheduled for today"
                    />
                    <MetricCard
                      label="Needs doctor assignment"
                      value={patientsAwaitingDoctor}
                      description="Patients without a primary doctor"
                    />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold text-slate-800">Upcoming appointments</h4>
                        <span className="text-xs uppercase tracking-wide text-slate-400">
                          Next {nextAppointments.length} visits
                        </span>
                      </div>
                      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-4 py-3">Patient</th>
                              <th className="px-4 py-3">When</th>
                              <th className="px-4 py-3">Doctor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {nextAppointments.length ? (
                              nextAppointments.map((appointment) => {
                                const patientName = getPatientDisplayName(appointment.patient);
                                const doctorName = getDoctorDisplayName(appointment.doctor);

                                return (
                                  <tr key={appointment.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                      <div className="font-medium text-slate-900">{patientName}</div>
                                      <div className="text-xs text-slate-500">
                                        {appointment.patient?.contactNumber || appointment.patient?.email || "No contact listed"}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                      <div>{formatDate(appointment.appointmentDate)}</div>
                                      <span className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                                        {appointment.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{doctorName}</td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">
                                  No scheduled visits within the next week.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-5 lg:col-span-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-semibold text-slate-800">Doctor management</h4>
                          {isLoadingDoctors ? (
                            <span className="text-xs uppercase tracking-wide text-slate-400">Loading…</span>
                          ) : null}
                        </div>

                        {doctorMessage ? (
                          <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                            {doctorMessage}
                          </p>
                        ) : null}
                        {doctorError ? (
                          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
                            {doctorError}
                          </p>
                        ) : null}

                        <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={handleCreateDoctor}>
                          <input
                            required
                            value={doctorForm.firstName}
                            onChange={(e) => handleDoctorFormChange("firstName", e.target.value)}
                            placeholder="First name"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <input
                            required
                            value={doctorForm.lastName}
                            onChange={(e) => handleDoctorFormChange("lastName", e.target.value)}
                            placeholder="Last name"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <input
                            required
                            value={doctorForm.username}
                            onChange={(e) => handleDoctorFormChange("username", e.target.value)}
                            placeholder="Username"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <input
                            required
                            type="email"
                            value={doctorForm.email}
                            onChange={(e) => handleDoctorFormChange("email", e.target.value)}
                            placeholder="Email"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <input
                            required
                            type="password"
                            value={doctorForm.password}
                            onChange={(e) => handleDoctorFormChange("password", e.target.value)}
                            placeholder="Temporary password"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none sm:col-span-2"
                          />
                          <div className="sm:col-span-2 flex justify-end">
                            <button
                              type="submit"
                              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                            >
                              Register doctor
                            </button>
                          </div>
                        </form>

                        <div className="mt-4">
                          <h5 className="text-sm font-semibold text-slate-800">Active doctors</h5>
                          <ul className="mt-3 space-y-3 text-sm text-slate-700">
                            {doctorDirectory.length ? (
                              doctorDirectory.map((doctor) => (
                                <li
                                  key={doctor.id}
                                  className="rounded-lg border border-slate-200 px-4 py-3 shadow-sm"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="font-semibold text-slate-900">
                                        {`${doctor.firstName || ""} ${doctor.lastName || ""}`.trim() || doctor.username}
                                      </div>
                                      <div className="text-xs text-slate-500">{doctor.email}</div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDoctor(doctor.id)}
                                      className="text-xs font-semibold text-red-600 hover:text-red-700"
                                    >
                                      Remove
                                    </button>
                                  </div>

                                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                    <select
                                      value={doctorAssignments[doctor.id] || ""}
                                      onChange={(e) =>
                                        setDoctorAssignments((prev) => ({ ...prev, [doctor.id]: e.target.value }))
                                      }
                                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    >
                                      <option value="">Assign to patient…</option>
                                      {staffPatients.map((patient) => (
                                        <option key={patient.id} value={patient.id}>
                                          {getPatientDisplayName(patient)}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => handleAssignDoctor(doctor.id)}
                                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                                    >
                                      Assign
                                    </button>
                                  </div>
                                </li>
                              ))
                            ) : (
                              <li className="rounded-lg border border-dashed border-slate-300 px-4 py-4 text-center text-sm text-slate-500">
                                No doctors registered yet.
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h4 className="text-base font-semibold text-slate-800">Recently onboarded patients</h4>
                        <ul className="mt-3 space-y-3 text-sm text-slate-600">
                          {recentStaffPatients.length ? (
                            recentStaffPatients.map((patient) => (
                              <li key={patient.id} className="rounded-lg border border-slate-200 px-4 py-3 shadow-sm">
                                <div className="font-semibold text-slate-900">{getPatientDisplayName(patient)}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {patient.contactNumber || patient.email || "No contact details provided"}
                                </div>
                                {patient.primaryDoctor ? (
                                  <div className="mt-1 text-xs text-slate-500">
                                    Primary doctor: <span className="font-medium text-slate-700">{getDoctorDisplayName(patient.primaryDoctor)}</span>
                                  </div>
                                ) : null}
                              </li>
                            ))
                          ) : (
                            <li className="rounded-lg border border-dashed border-slate-300 px-4 py-4 text-center text-sm text-slate-500">
                              No recent patient registrations.
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-5">
                        <h4 className="text-base font-semibold text-blue-900">Action checklist</h4>
                        <ul className="mt-3 space-y-3 text-sm text-blue-900/80">
                          <li className="flex items-start gap-2">
                            <span className="mt-1 h-2 w-2 rounded-full bg-blue-500"></span>
                            <span>Confirm tomorrow's appointments have updated contact preferences.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500"></span>
                            <span>Assign a primary doctor to patients waiting for clinical guidance.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1 h-2 w-2 rounded-full bg-amber-500"></span>
                            <span>Follow up on completed visits to capture post-visit notes.</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {isAdmin ? (
            <section className="space-y-6 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Administrative insights</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Monitor platform health and keep an eye on the latest activity across roles.
                  </p>
                </div>
                {isLoadingAdmin ? (
                  <span className="text-sm font-medium text-slate-500">Syncing metrics…</span>
                ) : null}
              </div>

              {adminError ? (
                <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {adminError}
                </p>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      label="Total users"
                      value={adminStatistics?.totalUsers ?? "—"}
                      description="All registered accounts"
                    />
                    <MetricCard
                      label="Patients on file"
                      value={adminStatistics?.totalPatients ?? "—"}
                      description="Profiles with clinical data"
                    />
                    <MetricCard
                      label="All appointments"
                      value={adminStatistics?.totalAppointments ?? "—"}
                      description="Lifetime volume"
                    />
                    <MetricCard
                      label="Pending / reschedules"
                      value={pendingOrReschedule}
                      description="Needs intervention"
                    />
                    <MetricCard
                      label="Upcoming visits"
                      value={adminStatistics?.scheduledAppointments ?? "—"}
                      description="Appointments still scheduled"
                    />
                    <MetricCard
                      label="Medical records"
                      value={adminStatistics?.recordsDocumented ?? "—"}
                      description="Clinical notes captured"
                    />
                  </div>

                  {roleBreakdownEntries.length ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <h4 className="text-base font-semibold text-slate-800">Team composition</h4>
                      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {roleBreakdownEntries.map(([roleName, count]) => (
                          <li key={roleName} className="flex items-center justify-between rounded-lg bg-white px-4 py-3 text-sm shadow-sm">
                            <span className="capitalize text-slate-600">{roleName}</span>
                            <span className="font-semibold text-slate-900">{count}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {Object.keys(appointmentBreakdown).length ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <h4 className="text-base font-semibold text-slate-800">Appointment status</h4>
                      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(appointmentBreakdown).map(([statusName, count]) => (
                          <li
                            key={statusName}
                            className="flex items-center justify-between rounded-lg bg-white px-4 py-3 text-sm shadow-sm"
                          >
                            <span className="capitalize text-slate-600">{formatStatusLabel(statusName)}</span>
                            <span className="font-semibold text-slate-900">{count}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="grid gap-6 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold text-slate-800">Newest accounts</h4>
                        <span className="text-xs uppercase tracking-wide text-slate-400">Last {recentUsers.length} sign-ups</span>
                      </div>
                      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-4 py-3">User</th>
                              <th className="px-4 py-3">Role</th>
                              <th className="px-4 py-3">Created</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {recentUsers.length ? (
                              recentUsers.map((account) => (
                                <tr key={account.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-slate-900">{account.username}</div>
                                    <div className="text-xs text-slate-500">{account.email}</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-700">
                                      {account.role}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(account.createdAt)}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">
                                  No user activity to display yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-5 lg:col-span-2">
                      <h4 className="text-base font-semibold text-slate-800">Upcoming admin actions</h4>
                      <p className="text-sm text-slate-600">
                        This workspace will grow with analytics and tooling for managing staff, auditing records, and reviewing
                        patient onboarding health checks. For now, use the API to perform advanced administration tasks.
                      </p>
                      <ul className="space-y-3 text-sm text-slate-600">
                        <li className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-blue-500"></span>
                          <span>Automated compliance summaries for upcoming audits.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500"></span>
                          <span>Bulk staff onboarding and credential verification workflows.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-amber-500"></span>
                          <span>Real-time appointment utilization tracking with alerts.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : null}
        </div>
      )}
    </Layout>
  );
}

function MetricCard({ label, value, description }) {
  const displayValue = typeof value === "number" ? value.toLocaleString() : value;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{displayValue}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}
