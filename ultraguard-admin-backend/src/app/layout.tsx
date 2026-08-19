import { AuthProvider } from "@/lib/auth-context";
import { ResidentAuthProvider } from "@/lib/resident-auth-context";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata = {
  title: "Ultra-Guard Admin Portal",
  description: "Ultra-Guard Security & Fire — Visitor Access Management System admin portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ResidentAuthProvider>{children}</ResidentAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
