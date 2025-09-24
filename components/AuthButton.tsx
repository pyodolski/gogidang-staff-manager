"use client";
import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

// 모바일용 드롭다운 메뉴 컴포넌트
function MobileAuthMenu({
  user,
  profile,
  onLogout,
}: {
  user: any;
  profile: any;
  onLogout: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {(profile?.full_name || user.email)?.charAt(0).toUpperCase()}
        </div>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 드롭다운 메뉴 */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            {/* 사용자 정보 */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                  {(profile?.full_name || user.email)?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-800 text-sm">
                    {profile?.full_name || user.email}
                  </div>
                  {profile?.role === "super" && (
                    <div className="text-xs text-red-600">슈퍼관리자</div>
                  )}
                  {profile?.role === "admin" && (
                    <div className="text-xs text-blue-600">관리자</div>
                  )}
                  {profile?.role === "employee" && (
                    <div className="text-xs text-gray-500">직원</div>
                  )}
                </div>
              </div>
            </div>

            {/* 메뉴 항목들 */}
            <div className="py-2">
              {profile?.role === "super" && (
                <Link
                  href="/super"
                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  슈퍼관리자
                </Link>
              )}

              {profile?.role === "admin" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  관리자
                </Link>
              )}

              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0H8v0z"
                  />
                </svg>
                대시보드
              </Link>

              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors w-full text-left"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                로그아웃
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUserAndProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();
        setProfile(profileData);
      }

      setLoading(false);
    };

    getUserAndProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", session.user.id)
          .single();
        setProfile(profileData);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogin = async () => {
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error("Login error:", error);
        alert("로그인 오류: " + error.message);
        setLoading(false);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("로그인 중 오류가 발생했습니다: " + err);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <button className="px-4 py-2 bg-gray-400 text-white rounded" disabled>
        로딩중...
      </button>
    );
  }

  if (!user) {
    return (
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={handleLogin}
      >
        Google 로그인
      </button>
    );
  }

  return (
    <>
      {/* 데스크톱 버전 */}
      <div className="hidden md:flex items-center gap-4">
        <div className="text-sm text-gray-600">
          <div>{profile?.full_name || user.email}</div>
          {profile?.role === "super" && (
            <div className="text-xs text-red-600">슈퍼관리자</div>
          )}
          {profile?.role === "admin" && (
            <div className="text-xs text-blue-600">관리자</div>
          )}
        </div>

        <div className="flex gap-2">
          {profile?.role === "super" && (
            <Link
              href="/super"
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              슈퍼관리자
            </Link>
          )}
          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              관리자
            </Link>
          )}
          <Link
            href="/dashboard"
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            대시보드
          </Link>
          <button
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            onClick={handleLogout}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 모바일 버전 */}
      <MobileAuthMenu user={user} profile={profile} onLogout={handleLogout} />
    </>
  );
}
