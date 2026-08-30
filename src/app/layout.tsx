import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Socios | Sindicato N°2 Banco BICE",
  description: "Administración de socios y adherentes",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "App Socios", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#0b3b66" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
