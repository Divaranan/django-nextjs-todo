import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  title: "TaskFlow - To-Do List",
  description: "Django + Next.js To-Do List application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}