import { createClient } from './supabase/client';

export type UserRole = 'employee' | 'admin' | 'super';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  hourly_wage: number;
}

/**
 * 현재 사용자의 프로필과 권한을 확인합니다.
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

/**
 * 사용자가 특정 권한 이상을 가지고 있는지 확인합니다.
 */
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    employee: 1,
    admin: 2,
    super: 3
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * 사용자가 관리자 권한 이상을 가지고 있는지 확인합니다.
 */
export function isAdminOrAbove(userRole: UserRole): boolean {
  return hasPermission(userRole, 'admin');
}

/**
 * 사용자가 Super 권한을 가지고 있는지 확인합니다.
 */
export function isSuper(userRole: UserRole): boolean {
  return userRole === 'super';
}

/**
 * 역할을 한국어로 변환합니다.
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    employee: '직원',
    admin: '관리자',
    super: '슈퍼관리자'
  };

  return roleNames[role];
}