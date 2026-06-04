"use client";

import { useActionState, useState } from "react";
import {
  updateProfileSettingsAction,
  type ProfileSettingsActionState,
} from "@/app/(app)/settings/actions";
import { getProfileDisplayName, getProfileInitials } from "@/lib/profile-display";
import type { CurrentProfile, ProfileLanguage } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

const initialState: ProfileSettingsActionState = {
  status: "idle",
  message: "",
};

const languageOptions: Array<{ label: string; value: ProfileLanguage }> = [
  { label: "Italiano", value: "it" },
  { label: "Deutsch", value: "de" },
  { label: "Français", value: "fr" },
  { label: "English", value: "en" },
];

function getSettingsProfile(profile: CurrentProfile | null) {
  return {
    fullName: profile?.fullName?.trim() ?? "",
    phone: profile?.phone ?? "",
    language: profile?.language ?? "it",
    currency: profile?.currency ?? "CHF",
    dateFormat: profile?.dateFormat ?? "DD/MM/YYYY",
    notificationEmail: profile?.notificationEmail ?? true,
    notificationPush: profile?.notificationPush ?? true,
    notificationSms: profile?.notificationSms ?? false,
  };
}

function SaveMessage({ state }: { state: ProfileSettingsActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-lg px-3 py-2 text-[12px] font-medium",
        state.status === "success"
          ? "border border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]"
          : "border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]"
      )}
    >
      {state.message}
    </p>
  );
}

function FieldError({ children }: { children?: string }) {
  return children ? (
    <p className="mt-1 text-[11px] text-[var(--danger-text)]">{children}</p>
  ) : null;
}

function NotificationHiddenInputs({
  profile,
}: {
  profile: ReturnType<typeof getSettingsProfile>;
}) {
  return (
    <>
      <input type="hidden" name="notification_email" value={profile.notificationEmail ? "on" : ""} />
      <input type="hidden" name="notification_push" value={profile.notificationPush ? "on" : ""} />
      <input type="hidden" name="notification_sms" value={profile.notificationSms ? "on" : ""} />
    </>
  );
}

function ProfileHiddenInputs({
  profile,
}: {
  profile: ReturnType<typeof getSettingsProfile>;
}) {
  return (
    <>
      <input type="hidden" name="full_name" value={profile.fullName} />
      <input type="hidden" name="phone" value={profile.phone} />
      <input type="hidden" name="language" value={profile.language} />
      <input type="hidden" name="currency" value={profile.currency} />
      <input type="hidden" name="date_format" value={profile.dateFormat} />
    </>
  );
}

export function ProfileSettingsPanels({ profile }: { profile: CurrentProfile | null }) {
  const values = getSettingsProfile(profile);
  const [state, formAction, pending] = useActionState(
    updateProfileSettingsAction,
    initialState
  );
  const [language, setLanguage] = useState<ProfileLanguage>(values.language);
  const memberSince = profile?.createdAt
    ? `Membro dal ${formatDate(profile.createdAt)}`
    : "Profilo attivo";

  return (
    <form
      action={formAction}
      onReset={() => setLanguage(values.language)}
      className="space-y-4"
    >
      <NotificationHiddenInputs profile={values} />
      <p className="text-[12px] leading-relaxed text-muted">
        Queste informazioni aiutano Atlas a personalizzare il tuo spazio assicurativo. I campi
        contrassegnati come salvati vengono memorizzati sul tuo profilo Atlas.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Informazioni profilo">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="text-center sm:text-left">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-2xl font-semibold text-white sm:mx-0">
              {getProfileInitials(profile)}
            </div>
            <p className="mt-3 text-[14px] font-semibold text-foreground">
              {getProfileDisplayName(profile)}
            </p>
            <StatusBadge
              variant={profile?.hasProfileRow ? "ok" : "processing"}
              label={profile?.hasProfileRow ? "Profilo attivo" : "Profilo in attesa"}
              className="mt-1"
            />
            <p className="mt-1 text-[11px] text-muted">{memberSince}</p>
          </div>

          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="settings-full-name" className="text-[11px] font-medium text-muted">
                Nome completo
              </label>
              <input
                id="settings-full-name"
                name="full_name"
                type="text"
                required
                defaultValue={values.fullName}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
              <FieldError>{state.fieldErrors?.fullName}</FieldError>
            </div>
            <div>
              <label htmlFor="settings-email" className="text-[11px] font-medium text-muted">
                Email
              </label>
              <input
                id="settings-email"
                type="email"
                readOnly
                defaultValue={profile?.email ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-card-muted px-3 py-2 text-[13px] text-muted outline-none"
              />
            </div>
            <div>
              <label htmlFor="settings-phone" className="text-[11px] font-medium text-muted">
                Telefono
              </label>
              <input
                id="settings-phone"
                name="phone"
                type="tel"
                defaultValue={values.phone}
                placeholder="+41 ..."
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Lingua e regione">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="settings-language" className="text-[11px] font-medium text-muted">
              Lingua
            </label>
            <select
              id="settings-language"
              name="language"
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value as ProfileLanguage)
              }
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError>{state.fieldErrors?.language}</FieldError>
            <p className="mt-1.5 text-[10px] leading-snug text-muted">
              Preferenza salvata nel profilo. Localizzazione completa dell&apos;interfaccia in
              preparazione.
            </p>
          </div>
          <div>
            <label htmlFor="settings-currency" className="text-[11px] font-medium text-muted">
              Valuta
            </label>
            <select
              id="settings-currency"
              name="currency"
              defaultValue={values.currency}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            >
              <option value="CHF">CHF</option>
            </select>
            <FieldError>{state.fieldErrors?.currency}</FieldError>
          </div>
          <div>
            <label htmlFor="settings-date-format" className="text-[11px] font-medium text-muted">
              Formato data
            </label>
            <select
              id="settings-date-format"
              name="date_format"
              defaultValue={values.dateFormat}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
            <FieldError>{state.fieldErrors?.dateFormat}</FieldError>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-border-subtle pt-4">
          <SaveMessage state={state} />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="reset"
              className="w-full rounded-lg border border-border px-4 py-2.5 text-[13px] font-medium text-muted-foreground transition hover:bg-card-muted sm:w-auto"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={pending}
              className="atlas-btn-primary w-full px-4 py-2.5 text-[13px] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              {pending ? "Salvataggio..." : "Salva modifiche"}
            </button>
          </div>
        </div>
      </SectionCard>
      </div>
    </form>
  );
}

export function NotificationSettingsForm({
  profile,
}: {
  profile: CurrentProfile | null;
}) {
  const values = getSettingsProfile(profile);
  const [state, formAction, pending] = useActionState(
    updateProfileSettingsAction,
    initialState
  );
  const notificationChannels = [
    {
      name: "notification_email",
      label: "Email",
      description: "Aggiornamenti e scadenze nella casella del profilo.",
      checked: values.notificationEmail,
    },
    {
      name: "notification_push",
      label: "Push",
      description: "Avvisi rapidi nell'app quando saranno disponibili.",
      checked: values.notificationPush,
    },
    {
      name: "notification_sms",
      label: "SMS",
      description: "Messaggi al numero salvato nel profilo.",
      checked: values.notificationSms,
    },
  ];

  return (
    <SectionCard
      title="Preferenze notifiche"
      description="Salvate sul profilo — l'invio effettivo dipende dai canali attivi"
    >
      <form action={formAction}>
        <ProfileHiddenInputs profile={values} />
        <p className="mb-3 text-[11px] leading-relaxed text-muted">
          Le preferenze vengono memorizzate subito. Email è il canale principale oggi; push e SMS
          seguiranno quando i servizi di notifica saranno collegati.
        </p>
        <div className="divide-y divide-border-subtle">
          {notificationChannels.map((channel) => (
            <label
              key={channel.name}
              className="flex cursor-pointer items-center justify-between gap-4 py-3 first:pt-0"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-foreground">
                  {channel.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                  {channel.description}
                </span>
              </span>
              <input
                name={channel.name}
                type="checkbox"
                defaultChecked={channel.checked}
                className="h-4 w-4 shrink-0 rounded border-border text-accent"
              />
            </label>
          ))}
        </div>

        <div className="mt-4 space-y-3 border-t border-border-subtle pt-4">
          <SaveMessage state={state} />
          <FieldError>{state.fieldErrors?.fullName}</FieldError>
          <button
            type="submit"
            disabled={pending}
            className="atlas-btn-primary w-full px-4 py-2.5 text-[13px] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          >
            {pending ? "Salvataggio..." : "Salva notifiche"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}
