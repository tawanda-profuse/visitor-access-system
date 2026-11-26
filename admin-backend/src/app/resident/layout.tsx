import "./resident.css";

// Overrides the root layout's "SecureGate Admin Portal" title/description for every
// page under /resident/*.
export const metadata = {
  title: "SecureGate Resident Portal",
  description: "SecureGate — manage your visitor Gate Passes from any browser",
};

export default function ResidentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
