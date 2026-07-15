import { useEffect, useMemo, type ComponentProps } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  Building2,
  ClipboardList,
  FileCheck2,
  Loader2,
  LogOut,
  Plus,
  Settings2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription as UiCardDescription,
  CardHeader,
  CardTitle as UiCardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import LanguageSelector, {
  applyLanguagePreference,
  getStoredOutputLanguage,
  type LanguageCode,
} from "@/components/LanguageSelector";
import { trpc } from "@/lib/trpc";
import { useAutoTranslatedText } from "@/lib/useAutoTranslatedText";
import {
  createDefaultAdminConfiguration,
  normalizeAdminConfiguration,
  type AdminConfiguration,
} from "@shared/adminConfig";

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const tx = useAutoTranslatedText();
  const { user, loading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(() => getStoredOutputLanguage());

  const { data, isLoading } = trpc.admin.getEnterpriseConfig.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLocation("/");
      return;
    }
    if (user.role !== "admin") setLocation("/home");
  }, [authLoading, setLocation, user]);

  const config = useMemo(
    () => normalizeAdminConfiguration(data || createDefaultAdminConfiguration()),
    [data]
  );

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {tx("Loading admin setup...")}
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  const handleLanguageChange = (language: LanguageCode) => {
    setSelectedLanguage(language);
    applyLanguagePreference(language, i18n);
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const selectedOrganization =
    config.organizations.find((organization) => organization.id === config.selectedOrganizationId) ||
    config.organization;
  const selectedParticipantCount = countParticipantsForOrganization(config, selectedOrganization.id);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <img src="/emeritus-logo.png" alt="Emeritus" className="h-10 object-contain" />
            <div className="hidden h-8 w-px bg-border sm:block" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-foreground">
                {t("adminSetupTitle", { defaultValue: "Admin Setup" })}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("adminSetupDashboardDescription", {
                  defaultValue: "Manage organizations, participants, program context, IDP rules, and evidence controls.",
                })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <LanguageSelector selectedLanguage={selectedLanguage} onLanguageChange={handleLanguageChange} className="gap-2" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation("/admin/users")}
              aria-label={tx("User Management")}
              title={tx("User Management")}
            >
              <Users className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={() => setLocation("/admin/setup")}
              aria-label={tx("Open Admin Setup")}
              title={tx("Open Admin Setup")}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleLogout} aria-label={tx("Logout")} title={tx("Logout")}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container flex max-w-7xl flex-col gap-6 py-8">
        <div className="grid gap-4 md:grid-cols-4">
          <SetupMetric icon={Building2} label="Organizations" value={String(config.organizations.length)} />
          <SetupMetric icon={Users} label="Participants in selected org" value={String(selectedParticipantCount)} />
          <SetupMetric icon={ClipboardList} label="IDP approaches" value={String(config.idp.allowedApproaches.length)} />
          <SetupMetric icon={FileCheck2} label="Evidence controls" value={config.evidence.evidenceReviewStatus.replace("_", " ")} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card>
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Organization Setup</CardTitle>
                <CardDescription>
                  Select an organization in setup to edit its branding and keep participant data separated.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setLocation("/admin/setup#organization")}
                aria-label={tx("Add organization")}
                title={tx("Add organization")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3">
              {config.organizations.map((organization) => {
                const participantCount = countParticipantsForOrganization(config, organization.id);
                const isSelected = organization.id === selectedOrganization.id;
                return (
                  <button
                    key={organization.id}
                    type="button"
                    onClick={() => setLocation("/admin/setup#organization")}
                    className="rounded-md border p-4 text-left transition hover:border-primary/50 hover:bg-muted/40"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-base font-semibold">{organization.organizationName}</h2>
                  {isSelected && <Badge variant="secondary">{tx("Selected")}</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {organization.region || "Global"} · {organization.defaultLanguage.toUpperCase()} · ID {organization.id}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {participantCount} {tx(participantCount === 1 ? "participant" : "participants")}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selected Organization</CardTitle>
              <CardDescription>{tx("Quick actions for")} {selectedOrganization.organizationName}.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="rounded-md border bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground">{tx("Current organization")}</p>
                <p className="mt-1 font-semibold">{selectedOrganization.organizationName}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedParticipantCount} {tx(selectedParticipantCount === 1 ? "participant stored under this organization." : "participants stored under this organization.")}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => setLocation("/admin/setup#participants")} className="justify-start gap-2">
                <Users className="h-4 w-4" />
                {tx("Manage participants")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setLocation("/admin/setup#program")} className="justify-start gap-2">
                <ClipboardList className="h-4 w-4" />
                {tx("Program objectives and competencies")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setLocation("/admin/setup#idp")} className="justify-start gap-2">
                <Settings2 className="h-4 w-4" />
                {tx("IDP configuration")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setLocation("/admin/setup#evidence")} className="justify-start gap-2">
                <FileCheck2 className="h-4 w-4" />
                {tx("Evidence controls")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setLocation("/admin/setup#report")} className="justify-start gap-2">
                <ClipboardList className="h-4 w-4" />
                {tx("IDP report configuration")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function countParticipantsForOrganization(config: AdminConfiguration, organizationId: string) {
  return config.participants.filter((participant) => participant.organizationId === organizationId).length;
}

function CardTitle({ children, ...props }: ComponentProps<typeof UiCardTitle>) {
  const tx = useAutoTranslatedText();
  return <UiCardTitle {...props}>{typeof children === "string" ? tx(children) : children}</UiCardTitle>;
}

function CardDescription({ children, ...props }: ComponentProps<typeof UiCardDescription>) {
  const tx = useAutoTranslatedText();
  return <UiCardDescription {...props}>{typeof children === "string" ? tx(children) : children}</UiCardDescription>;
}

function SetupMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  const tx = useAutoTranslatedText();
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 pt-6">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{tx(label)}</p>
          <p className="mt-1 truncate text-xl font-semibold capitalize">{tx(value)}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
