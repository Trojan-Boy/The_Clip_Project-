import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Eye, KeyRound, Monitor, MousePointer2, Play, ShieldCheck } from "lucide-react";
import type { PersonalOperatorAdapterType } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { companiesApi } from "@/api/companies";
import { personalOperatorApi } from "@/api/personalOperator";
import { queryKeys } from "@/lib/queryKeys";

const adapterOptions: Array<{ value: PersonalOperatorAdapterType; label: string }> = [
  { value: "hermes_local", label: "Hermes" },
  { value: "openclaw_gateway", label: "OpenClaw" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "ollama", label: "Ollama" },
];

function boolPatch(checked: boolean | "indeterminate") {
  return checked === true;
}

export function PersonalAI() {
  const queryClient = useQueryClient();
  const [daemonBaseUrl, setDaemonBaseUrl] = useState("http://127.0.0.1:3177");
  const [prompt, setPrompt] = useState("");

  const profileQuery = useQuery({
    queryKey: queryKeys.personalOperator.profile,
    queryFn: personalOperatorApi.profile,
  });
  const permissionsQuery = useQuery({
    queryKey: queryKeys.personalOperator.permissions,
    queryFn: personalOperatorApi.permissions,
  });
  const companiesQuery = useQuery({
    queryKey: queryKeys.companies.all,
    queryFn: companiesApi.list,
  });
  const runsQuery = useQuery({
    queryKey: queryKeys.personalOperator.runs,
    queryFn: personalOperatorApi.runs,
  });

  const permissionsByCompany = useMemo(
    () => new Map((permissionsQuery.data ?? []).map((permission) => [permission.companyId, permission])),
    [permissionsQuery.data],
  );

  const updateProfile = useMutation({
    mutationFn: personalOperatorApi.updateProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.personalOperator.profile }),
  });

  const updatePermission = useMutation({
    mutationFn: ({ companyId, patch }: { companyId: string; patch: Parameters<typeof personalOperatorApi.updatePermission>[1] }) =>
      personalOperatorApi.updatePermission(companyId, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.personalOperator.permissions }),
  });

  const daemonHealth = useMutation({
    mutationFn: () => personalOperatorApi.daemonHealth(daemonBaseUrl),
  });

  const createRun = useMutation({
    mutationFn: () =>
      personalOperatorApi.createRun({
        companyId: companiesQuery.data?.[0]?.id ?? null,
        prompt,
      }),
    onSuccess: () => {
      setPrompt("");
      queryClient.invalidateQueries({ queryKey: queryKeys.personalOperator.runs });
    },
  });

  const profile = profileQuery.data;
  const enabled = profile?.enabled ?? false;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Personal AI</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            A user-owned operator for company work, browser automation, screenshot vision, and local Windows desktop control.
          </p>
        </div>
        <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Enabled" : "Disabled by default"}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4" />
              Operator Controls
            </CardTitle>
            <CardDescription>Turn on only the capabilities this user has explicitly approved.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["enabled", "Personal AI enabled", ShieldCheck],
                ["daemonEnabled", "Local daemon", Monitor],
                ["browserControlEnabled", "Browser control", Eye],
                ["desktopControlEnabled", "Desktop mouse/keyboard", MousePointer2],
                ["screenshotVisionEnabled", "Screenshot vision", KeyRound],
              ].map(([key, label, Icon]) => (
                <label key={key as string} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
                  <Checkbox
                    checked={Boolean(profile?.[key as keyof typeof profile])}
                    disabled={profileQuery.isLoading || updateProfile.isPending}
                    onCheckedChange={(checked) => updateProfile.mutate({ [key as string]: boolPatch(checked) })}
                  />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{label as string}</span>
                </label>
              ))}
            </div>

            <div className="grid gap-2">
              <Label>Reasoning adapter</Label>
              <Select
                value={profile?.defaultAdapterType ?? "openrouter"}
                onValueChange={(value) => updateProfile.mutate({ defaultAdapterType: value as PersonalOperatorAdapterType })}
              >
                <SelectTrigger className="max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adapterOptions.map((adapter) => (
                    <SelectItem key={adapter.value} value={adapter.value}>{adapter.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                API keys must be saved as company secrets and referenced as <code>secret_ref</code>; raw key strings are rejected.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-base">Local Daemon</CardTitle>
            <CardDescription>Desktop actions are accepted only from loopback daemon URLs.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Input value={daemonBaseUrl} onChange={(event) => setDaemonBaseUrl(event.target.value)} />
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => daemonHealth.mutate()} disabled={daemonHealth.isPending}>
                Check daemon
              </Button>
              {daemonHealth.data && <Badge variant={daemonHealth.data.ok ? "default" : "destructive"}>{daemonHealth.data.ok ? "Online" : "Offline"}</Badge>}
            </div>
            {daemonHealth.error && (
              <p className="text-sm text-destructive">{daemonHealth.error instanceof Error ? daemonHealth.error.message : "Daemon check failed"}</p>
            )}
            <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              Action order: Paperclip API, browser DOM, accessibility tree, screenshot vision, desktop mouse/keyboard fallback.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-base">Company Allowlist</CardTitle>
          <CardDescription>Personal AI cannot read, write, or control a company until it is enabled here.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Company</th>
                <th>Read</th>
                <th>Write</th>
                <th>Browser</th>
                <th>Desktop</th>
                <th>Approval</th>
              </tr>
            </thead>
            <tbody>
              {(companiesQuery.data ?? []).map((company) => {
                const permission = permissionsByCompany.get(company.id);
                return (
                  <tr key={company.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{company.name}</td>
                    {(["readEnabled", "writeEnabled", "browserControlEnabled", "desktopControlEnabled", "approvalRequired"] as const).map((key) => (
                      <td key={key}>
                        <Checkbox
                          checked={permission?.[key] ?? key === "approvalRequired"}
                          onCheckedChange={(checked) =>
                            updatePermission.mutate({ companyId: company.id, patch: { [key]: boolPatch(checked) } })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-base">Start a Run</CardTitle>
            <CardDescription>Runs stay blocked until Personal AI and the selected company allowlist are enabled.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask the operator to inspect a local app or prepare company work." />
            <Button className="w-fit" disabled={!prompt.trim() || createRun.isPending || !enabled} onClick={() => createRun.mutate()}>
              <Play className="mr-2 h-4 w-4" />
              Queue run
            </Button>
            {createRun.error && (
              <p className="text-sm text-destructive">{createRun.error instanceof Error ? createRun.error.message : "Run failed"}</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-base">Recent Runs</CardTitle>
            <CardDescription>Audit starts at run creation and continues for every action.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {(runsQuery.data ?? []).slice(0, 6).map((run) => (
              <div key={run.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{run.prompt}</span>
                  <Badge variant="secondary">{run.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{run.adapterType}</p>
              </div>
            ))}
            {runsQuery.data?.length === 0 && <p className="text-sm text-muted-foreground">No Personal AI runs yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
