import { Sparkles } from "lucide-react";
import { PremiumOnboardingEmpty } from "@/components/onboarding/PremiumOnboardingEmpty";
import type { PortfolioProgression } from "@/lib/portfolio-progression";

interface RecommendationsEmptyStateProps {
  hasPortfolio: boolean;
  progression?: PortfolioProgression;
}

export function RecommendationsEmptyState({
  hasPortfolio,
  progression,
}: RecommendationsEmptyStateProps) {
  return (
    <PremiumOnboardingEmpty
      icon={<Sparkles className="h-7 w-7" />}
      title={
        hasPortfolio
          ? "Portafoglio allineato"
          : "Sblocca le raccomandazioni Atlas"
      }
      description={
        hasPortfolio
          ? "Non ci sono azioni urgenti sui dati attuali. Carica e conferma più polizze per raccomandazioni avanzate su completezza e coperture."
          : "Carica e conferma polizze per attivare raccomandazioni su completezza e coperture. I benchmark di mercato sono in preparazione."
      }
      actionLabel="Carica PDF"
      actionHref="/documents"
      secondaryActionLabel="Vedi polizze"
      secondaryActionHref="/policies"
      progression={progression}
      steps={[
        {
          step: "1",
          title: "Struttura",
          text: "Crea schede polizza da PDF o manualmente.",
        },
        {
          step: "2",
          title: "Verifica",
          text: "Conferma bozze per dati affidabili.",
        },
        {
          step: "3",
          title: "Azioni",
          text: "Priorità su gap, rinnovi e completezza.",
        },
      ]}
    />
  );
}
