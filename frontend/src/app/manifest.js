export default function manifest() {
  return {
    name: "EduERP School Management",
    short_name: "EduERP",
    description: "School administration portal for students, teachers and staff.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fff7ed",
    theme_color: "#ea7a18",
    orientation: "any",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
