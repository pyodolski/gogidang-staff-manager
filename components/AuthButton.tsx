"use client";
import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

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
    <div className="flex items-center gap-4">
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
  );
}
