import { Manrope } from "next/font/google";
import "./globals.css";

const font = Manrope({ subsets: ["latin"], display: "swap" });

export const metadata = { title: "Smart Task Manager", description: "Tasks, priorities and dependencies in real time" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={font.className}>{children}</body>
    </html>
  );
}
