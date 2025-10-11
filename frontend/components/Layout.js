import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children, title }) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const pageTitle = title ? `${title} | Medical Health Records` : "Medical Health Records";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Head>
        <title>{pageTitle}</title>
      </Head>

      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
          <div className="text-lg font-semibold text-slate-900">
            <Link href="/" className="transition hover:text-blue-600">
              Medical Health Records
            </Link>
          </div>

          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            {user ? (
              <>
                <span className="hidden text-slate-500 sm:inline">
                  Signed in as <span className="font-semibold text-slate-700">{user.username}</span>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full bg-blue-50 px-4 py-2 text-blue-600 transition hover:bg-blue-100 hover:text-blue-700"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-full px-4 py-2 transition hover:bg-blue-50 hover:text-blue-700">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-blue-600 px-4 py-2 text-white shadow-sm transition hover:bg-blue-700"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-12">
        {title ? (
          <h1 className="mb-6 text-center text-3xl font-semibold text-slate-900 drop-shadow-sm">
            {title}
          </h1>
        ) : null}
        <div className="w-full max-w-3xl rounded-2xl bg-white/95 p-8 shadow-2xl shadow-blue-100 ring-1 ring-slate-200 backdrop-blur">
          {children}
        </div>
      </main>
    </div>
  );
}
