import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Globe, LogIn } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from 'react-i18next';

export default function LanguageSelection() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const { i18n } = useTranslation();

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    // Change i18n language
    i18n.changeLanguage(language);
    // Store language preference in localStorage
    localStorage.setItem("preferredLanguage", language);
    localStorage.setItem("idp_language", language);
    // Redirect to main app
    setTimeout(() => {
      setLocation("/home");
    }, 300);
  };

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center">
        <div className="animate-pulse text-emerald-600 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Header with Logo and Login */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="cursor-pointer">
              <img
                src="/emeritus-logo.png"
                alt="Emeritus Logo"
                className="h-10 transition-transform duration-300 hover:scale-105"
              />
            </a>
          </div>
          {!user && (
            <Button
              onClick={handleLogin}
              variant="outline"
              className="gap-2 hover:bg-emerald-50 hover:border-emerald-600 hover:text-emerald-700 transition-all"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Button>
          )}
          {user && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">{user.name}</span>
              <span className="text-emerald-600">• {user.role === "admin" ? "Admin" : "User"}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          {/* Welcome Section */}
          <div className="space-y-4">
            <div className="flex justify-center mb-6">
              <div className="bg-emerald-100 p-4 rounded-full">
                <Globe className="h-16 w-16 text-emerald-600" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 tracking-tight">
              Welcome to IDP Builder
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Create comprehensive Individual Development Plans tailored to your career goals
              using AI-powered analysis of your training needs, assessments, and coaching reports.
            </p>
          </div>

          {/* Language Selection */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              Choose Your Preferred Language
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* English Button - LEFT */}
              <Card
                className={`group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 border-2 ${
                  selectedLanguage === "en"
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-gray-200 hover:border-emerald-400"
                }`}
                onClick={() => handleLanguageSelect("en")}
              >
                <div className="p-8 space-y-4">
                  <div className="flex justify-center">
                    <img src="/flag-uk.png" alt="UK Flag" className="w-24 h-24 object-contain" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                    English
                  </h3>
                  <p className="text-gray-600">
                    Continue in English
                  </p>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 text-lg transition-all"
                    size="lg"
                  >
                    Select English
                  </Button>
                </div>
              </Card>

              {/* Arabic Button - RIGHT */}
              <Card
                className={`group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 border-2 ${
                  selectedLanguage === "ar"
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-gray-200 hover:border-emerald-400"
                }`}
                onClick={() => handleLanguageSelect("ar")}
              >
                <div className="p-8 space-y-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex justify-center gap-2">
                      <img src="/saudi-flag-new.png" alt="Saudi Arabia" className="w-12 h-12 object-contain" />
                      <img src="/flag-ae.png" alt="UAE" className="w-12 h-12 object-contain" />
                      <img src="/flag-qa.png" alt="Qatar" className="w-12 h-12 object-contain" />
                    </div>
                    <div className="flex justify-center gap-2">
                      <img src="/flag-kw.png" alt="Kuwait" className="w-12 h-12 object-contain" />
                      <img src="/flag-bh.png" alt="Bahrain" className="w-12 h-12 object-contain" />
                      <img src="/flag-om-new.png" alt="Oman" className="w-12 h-12 object-contain" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                    العربية
                  </h3>
                  <p className="text-gray-600">
                    المتابعة بالعربية
                  </p>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 text-lg transition-all"
                    size="lg"
                  >
                    اختر العربية
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-16 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Your language preference will be saved for your session. You can change it anytime from the settings.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
