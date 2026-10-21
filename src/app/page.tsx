import Link from "next/link";

export default function Home() {
  return (
    <main className="p-10">
      <Link href="/login">تسجيل الدخول</Link>
    </main>
  );
}
