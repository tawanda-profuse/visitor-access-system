import "./resident.css";

// Overrides the root layout's "Ultra-Guard Admin Portal" title/description for every
// page under /resident/*.
export const metadata = {
  title: "Ultra-Guard Resident Portal",
  description: "Ultra-Guard Security & Fire — manage your visitor Gate Passes from any browser",
};

export default function ResidentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
