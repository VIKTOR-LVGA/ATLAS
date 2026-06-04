import Link from "next/link";
import { Upload } from "lucide-react";
import { LandingSection } from "@/components/landing/LandingSection";

export function LandingFinalCta() {
  return (
    <LandingSection tone="base" className="border-t-0 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="landing-preview-aura">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/25 via-[#0e1528] to-[#060a12] px-8 py-14 text-center shadow-2xl sm:px-16">
            <div
              className="landing-glow-orb left-1/2 top-0 h-56 w-[28rem] -translate-x-1/2"
              style={{ background: "rgba(129, 140, 248, 0.35)" }}
            />
            <div className="landing-grid-bg pointer-events-none absolute inset-0 opacity-20" />
            <div className="relative">
              <p className="landing-eyebrow">Inizia ora</p>
              <h2 className="landing-heading mt-3">
                Pronto a capire le tue assicurazioni?
              </h2>
              <p className="landing-lead mx-auto mt-4 max-w-lg">
                Carica il primo PDF, rivedi l&apos;estrazione AI e conferma le tue polizze
                con la stessa interfaccia che userai ogni giorno.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/register" className="landing-btn-primary px-8">
                  <Upload className="h-4 w-4" />
                  Inizia gratis
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted transition hover:text-white"
                >
                  Hai già un account? Accedi
                </Link>
              </div>
              <p className="mt-8 text-xs text-muted">
                Gratuito per iniziare · nessuna carta di credito richiesta
              </p>
            </div>
          </div>
        </div>
      </div>
    </LandingSection>
  );
}
