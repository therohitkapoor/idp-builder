import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useTranslation } from 'react-i18next';
import { lazy, Suspense, useEffect } from 'react';

const Home = lazy(() => import("./pages/Home"));
const IdpView = lazy(() => import("./pages/IdpView"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LanguageSelection = lazy(() => import("./pages/LanguageSelection"));
const Login = lazy(() => import("./pages/Login"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminSetup = lazy(() => import("./pages/AdminSetup"));
const NotFound = lazy(() => import("./pages/NotFound"));

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Login} />
      <Route path={"/home"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/language"} component={LanguageSelection} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/admin/users"} component={AdminUsers} />
      <Route path={"/admin/setup"} component={AdminSetup} />
      <Route path={"/idp/:id"} component={IdpView} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { i18n, t } = useTranslation();

  useEffect(() => {
    const language = i18n.resolvedLanguage || i18n.language || 'en';
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [i18n.language, i18n.resolvedLanguage]);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
                {t("loading")}
              </div>
            }
          >
            <Router />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
