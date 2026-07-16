import { FormEvent, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AlertCircle, ArrowRight, Building2, Loader2, LockKeyhole, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { getOAuthLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";

const sampleAccounts = [
  {
    label: "Admin",
    email: "admin@idp.local",
    password: "Admin@123",
    description: "Organisation setup, participants, programs, and controls",
    icon: ShieldCheck,
  },
  {
    label: "User",
    email: "user@idp.local",
    password: "User@123",
    description: "Create and manage individual development plans",
    icon: UserRound,
  },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { user, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const oauthUrl = useMemo(() => getOAuthLoginUrl(), []);
  const { data: loginOptions } = trpc.auth.loginOptions.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const sampleAccountsAllowedByClient = useMemo(() => {
    const hostname = typeof window === "undefined" ? "" : window.location.hostname;
    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(hostname);
    return import.meta.env.VITE_SHOW_SAMPLE_ACCOUNTS === "true" || isLocalHost;
  }, []);
  const showSampleAccounts =
    sampleAccountsAllowedByClient || Boolean(loginOptions?.sampleAccountsEnabled);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (result) => {
      utils.auth.me.setData(undefined, result.user);
      void utils.auth.me.invalidate();
      toast.success(`Signed in as ${result.user.role === "admin" ? "Admin" : "User"}.`);
      window.location.assign(result.user.role === "admin" ? "/dashboard" : "/home");
    },
    onError: (error) => {
      toast.error(error.message || "Could not sign in with those details.");
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out. You can now use another account.");
  };

  const isSubmitting = loginMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="flex items-center gap-3 text-left"
            aria-label="Go to home"
          >
            <img src="/emeritus-logo.png" alt="Emeritus" className="h-9 w-auto" />
            <span className="hidden text-sm font-semibold text-slate-600 sm:inline">
              IDP Builder
            </span>
          </button>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            Enterprise access
          </Badge>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-73px)] w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_430px]">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-700">
            <Building2 className="h-4 w-4" />
            Organisation-led Individual Development Plans
          </div>
          <div className="max-w-2xl space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Sign in to continue
            </h1>
            <p className="text-lg leading-8 text-slate-600">
              Your account details decide whether you enter as an Admin or as a User. Admins manage the organisation setup and controls; users create, review, and export their IDPs.
            </p>
          </div>

          {showSampleAccounts && (
            <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
              {sampleAccounts.map((account) => {
                const Icon = account.icon;
                return (
                  <button
                    key={account.email}
                    type="button"
                    data-testid={`${account.label.toLowerCase()}-sample-login`}
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                      loginMutation.mutate({
                        email: account.email,
                        password: account.password,
                      });
                    }}
                    disabled={isSubmitting}
                    className="rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/60"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 font-semibold text-slate-900">
                        <Icon className="h-4 w-4 text-emerald-600" />
                        {account.label}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{account.description}</p>
                    <p className="mt-3 text-xs font-medium text-slate-500">{account.email}</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <Card className="rounded-lg border-slate-200 bg-white shadow-md">
          <CardHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
              Enter the email and password shared for your IDP Builder account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              {user && (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  <AlertTitle>Currently signed in</AlertTitle>
                  <AlertDescription className="gap-3">
                    <span>
                      {user.name || user.email} is signed in as {user.role === "admin" ? "Admin" : "User"}.
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.assign(user.role === "admin" ? "/dashboard" : "/home")}
                      >
                        Continue
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={handleLogout}
                        aria-label="Sign out"
                        title="Sign out"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  data-testid="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  data-testid="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>

              {loginMutation.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Login failed</AlertTitle>
                  <AlertDescription>{loginMutation.error.message}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                data-testid="login-submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {oauthUrl && (
              <>
                <div className="my-6 flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
                  <Separator className="flex-1" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    window.location.href = oauthUrl;
                  }}
                >
                  Continue with organisation SSO
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
