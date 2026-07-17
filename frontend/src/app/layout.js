
import "./globals.css";
import ProjectInputValidation from "@/components/ProjectInputValidation";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ProjectInputValidation />
        {children}
      </body>
    </html>
  );
}
