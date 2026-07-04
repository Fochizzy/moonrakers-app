import { AuthPanel } from "@/components/auth/AuthPanel";

export default function AuthPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem 1.25rem",
      }}
    >
      <AuthPanel />
    </main>
  );
}
