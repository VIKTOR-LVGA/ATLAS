import Link from "next/link";
import { Lock, Play, Shield, Upload, UserRound } from "lucide-react";
import { LandingDashboardPreview } from "@/components/landing/LandingDashboardPreview";

export function LandingHero() {
  return (
    <section className="landing-section-tone-glow relative overflow-hidden pt-24 pb-20 md:pt-28 md:pb-28">
      <div
        className="landing-glow-orb -left-32 top-0 h-[500px] w-[500px] opacity-80"
        style={{ background: "rgba(99, 102, 241, 0.18)" }}
      />
      <div className="landing-grid-bg pointer-events-none absolute inset-0 opacity-[0.18]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 xl:gap-14">
        <div className="max-w-[34rem] lg:pt-2">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--landing-border)] bg-[var(--landing-surface)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--landing-muted)]">
            <span aria-hidden>🇨🇭</span>
            AI per assicurazioni svizzere
          </p>

          <h1 className="landing-hero-headline mt-7">
            <span className="block">Atlas capisce</span>
            <span className="block">le tue assicurazioni.</span>
            <span className="mt-1 block">
              E ti aiuta a{" "}
              <span className="landing-hero-accent">individuare dove ottimizzare.</span>
            </span>
          </h1>

          <p className="landing-hero-lead mt-6">
            Carica le tue polizze, organizza il portfolio e prepara i dati per future
            valutazioni. Capisci meglio premi, coperture, rinnovi e possibili aree da
            verificare.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/register" className="landing-btn-gradient">
              <Upload className="h-4 w-4" />
              Carica le tue polizze
            </Link>
            <a href="#how-it-works" className="landing-btn-ghost">
              <Play className="h-4 w-4" />
              Guarda come funziona
            </a>
          </div>

          <ul className="mt-9 flex flex-col gap-2.5 text-[12px] text-[var(--landing-muted)] sm:flex-row sm:flex-wrap sm:gap-x-7">
            <li className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-[var(--landing-accent-bright)]" />
              Pensato per documenti assicurativi
            </li>
            <li className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-[var(--landing-accent-bright)]" />
              Accesso riservato al tuo account
            </li>
            <li className="flex items-center gap-2">
              <UserRound className="h-3.5 w-3.5 text-[var(--landing-accent-bright)]" />
              I tuoi dati, solo tuoi
            </li>
          </ul>
        </div>

        <LandingDashboardPreview />
      </div>
    </section>
  );
}
