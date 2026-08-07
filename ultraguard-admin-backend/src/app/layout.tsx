export const metadata = {
  title: "Ultra-Guard Admin Backend",
  description: "Ultra-Guard Visitor Access Management System — API backend",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>{children}</body>
    </html>
  );
}
