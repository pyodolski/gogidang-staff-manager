import AuthButton from '../../components/AuthButton';

export default function LoginPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-6">직원관리 프로그램 로그인</h1>
      <AuthButton />
    </main>
  );
}
