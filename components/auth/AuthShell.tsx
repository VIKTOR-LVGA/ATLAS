import Link from "next/link";
import { AtlasBrandLogo } from "@/components/brand/AtlasBrandLogo";
import { IconShield } from "@/components/icons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface AuthShellProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 15% 0%, var(--glow-primary), transparent 55%), radial-gradient(ellipse 50% 40% at 85% 10%, var(--glow-secondary), transparent 50%)",
        }}
      />

      <header className="relative z-10 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center">
            <AtlasBrandLogo variant="stacked" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="hidden flex-col justify-center lg:flex">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft">
                <IconShield className="h-6 w-6 text-accent" />
              </div>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
                Capisci davvero le tue assicurazioni svizzere.
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">
                Piattaforma svizzera di intelligence assicurativa. Analizza polizze,
                individua criticità e ottimizza il tuo portafoglio in modo indipendente.
              </p>
              <ul className="mt-6 space-y-2 text-[13px] text-muted-foreground">
                {[
                  "Pensato per polizze svizzere",
                  "Nessuna vendita di polizze",
                  "Analisi trasparente e indipendente",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="w-full">
            <div className="mb-6 lg:hidden">
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              <p className="mt-1 text-[13px] text-muted">{subtitle}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
              <div className="mb-6 hidden lg:block">
                <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
                  {title}
                </h1>
                <p className="mt-1 text-[13px] text-muted">{subtitle}</p>
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
