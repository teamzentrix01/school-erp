
import "./globals.css";
import ProjectInputValidation from "@/components/ProjectInputValidation";
import PwaManager from "@/components/PwaManager";

export const metadata = {
  title: { default: "EduERP", template: "%s | EduERP" },
  description: "EduERP School Management System",
  applicationName: "EduERP",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "EduERP" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ea7a18" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ProjectInputValidation />
        {children}
        <PwaManager />
      </body>
    </html>
  );
}
