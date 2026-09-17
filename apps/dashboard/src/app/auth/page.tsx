import { AuthPanel } from "@/components/auth/AuthPanel";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function AuthPage() {
  return (
    <div className="centered-shell">
      <main className="centered-shell__body">
        <AuthPanel />
      </main>
      <SiteFooter />
    </div>
  );
}
