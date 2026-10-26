import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Giriş" };

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <LoginForm />
    </div>
  );
}
