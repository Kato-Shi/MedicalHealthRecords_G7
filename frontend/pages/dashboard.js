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

  if (!token) {
    return null;
  }

  const fullName = profile?.patientProfile
    ? `${profile.patientProfile.firstName} ${profile.patientProfile.lastName}`.trim()
    : user?.username;

  return (
    <Layout title="Dashboard">
      {isLoadingProfile ? (
        <p className="text-center text-sm text-slate-500">Loading your dashboard...</p>
      ) : error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
      ) : (
        <div className="space-y-6">
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
        </div>
      )}
    </Layout>
  );
}
