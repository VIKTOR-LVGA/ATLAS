import Link from "next/link";
import { AtlasBrandLogo } from "@/components/brand/AtlasBrandLogo";

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--landing-border)] bg-[var(--landing-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div>
            <Link href="/" className="inline-flex">
              <AtlasBrandLogo variant="stacked" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--landing-muted)]">
              L&apos;AI che capisce le polizze assicurative svizzere. Indipendente,
              trasparente, orientata alla chiarezza.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs text-[var(--landing-muted)]">
              <span aria-hidden>🇨🇭</span>
              Prodotto per il mercato svizzero
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--landing-muted)]">
                Prodotto
              </p>
              <ul className="mt-4 space-y-2.5 text-[var(--landing-muted)]">
                <li>
                  <Link
                    href="/register"
                    className="transition hover:text-[var(--landing-text)]"
                  >
                    Inizia gratis
                  </Link>
                </li>
                <li>
                  <a href="#product" className="transition hover:text-[var(--landing-text)]">
                    Funzionalità
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="transition hover:text-[var(--landing-text)]"
                  >
                    Come funziona
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--landing-muted)]">
                Account
              </p>
              <ul className="mt-4 space-y-2.5 text-[var(--landing-muted)]">
                <li>
                  <Link href="/login" className="transition hover:text-[var(--landing-text)]">
                    Accedi
                  </Link>
                </li>
                <li>
                  <a href="#security" className="transition hover:text-[var(--landing-text)]">
                    Sicurezza
                  </a>
                </li>
                <li>
                  <a href="#faq" className="transition hover:text-[var(--landing-text)]">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--landing-muted)]">
                Legale
              </p>
              <ul className="mt-4 space-y-2.5 text-[var(--landing-muted)]">
                <li className="text-[var(--landing-muted)]">
                  Documentazione legale in preparazione
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--landing-border)] pt-8 sm:flex-row">
          <p className="text-xs text-[var(--landing-muted)]">
            © {new Date().getFullYear()} Atlas · Svizzera
          </p>
          <p className="text-xs text-[var(--landing-muted)] opacity-80">
            Documentazione legale in preparazione
          </p>
        </div>
      </div>
    </footer>
  );
}
