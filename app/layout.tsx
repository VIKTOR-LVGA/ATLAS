import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Atlas — Gestione assicurativa",
    template: "%s | Atlas",
  },
  description:
    "Piattaforma di intelligence assicurativa per organizzare polizze svizzere, verificare coperture e preparare il portfolio.",
};

const themeInitScript = `(function(){try{var k="${THEME_STORAGE_KEY}";var s=localStorage.getItem(k);var t=s==="light"||s==="dark"?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${inter.variable} h-full overflow-x-hidden antialiased`} suppressHydrationWarning>
      <body className="min-h-full max-w-[100vw] overflow-x-hidden bg-background text-foreground">
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
          suppressHydrationWarning
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
