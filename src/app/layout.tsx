import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { LEAGUE_NAME, LEAGUE_TAGLINE } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: LEAGUE_NAME, template: `%s · ${LEAGUE_NAME}` },
  description: `${LEAGUE_TAGLINE}: standings, results and stats.`,
};

export const viewport: Viewport = { themeColor: "#0e0b13" };

const NAV = [
  { href: "/", label: "Standings" },
  { href: "/matches", label: "Matches" },
  { href: "/teams", label: "Teams" },
  { href: "/stats", label: "Stats" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen font-sans">
        <header className="border-b border-line bg-card/60">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
            <Link href="/" className="leading-tight">
              <div className="text-lg font-bold tracking-tight text-accent">{LEAGUE_NAME}</div>
              <div className="text-xs uppercase tracking-widest text-muted">{LEAGUE_TAGLINE}</div>
            </Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-md px-3 py-1.5 text-muted hover:bg-card-2 hover:text-text"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted">
          <Link href="/admin" className="hover:text-text">
            Admin
          </Link>
        </footer>
      </body>
    </html>
  );
}
