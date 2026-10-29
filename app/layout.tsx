import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { ThemeProvider, type Theme } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nuestra comunidad | Reservas",
  description: "Reservas de áreas comunes del condominio",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const saved = (await cookies()).get("community-theme")?.value;
  const theme: Theme = saved === "light" || saved === "dark" ? saved : "system";
  return (
    <html
      lang="es"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
