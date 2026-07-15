import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type LanguageCode =
  | "en"
  | "hi"
  | "zh"
  | "ar"
  | "id"
  | "vi"
  | "th"
  | "es"
  | "de"
  | "nl";

export const languageOptions: Array<{
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  region: string;
}> = [
  { code: "en", label: "English", nativeLabel: "English", region: "Global" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", region: "India" },
  { code: "zh", label: "Mandarin Chinese", nativeLabel: "中文", region: "China / APAC" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", region: "Middle East / Global" },
  { code: "id", label: "Bahasa Indonesia", nativeLabel: "Bahasa Indonesia", region: "Indonesia / APAC" },
  { code: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt", region: "Vietnam / APAC" },
  { code: "th", label: "Thai", nativeLabel: "ไทย", region: "Thailand / APAC" },
  { code: "es", label: "Spanish", nativeLabel: "Español", region: "Global" },
  { code: "de", label: "German", nativeLabel: "Deutsch", region: "Europe" },
  { code: "nl", label: "Dutch", nativeLabel: "Nederlands", region: "Europe" },
];

const supportedLanguageCodes = new Set(languageOptions.map((language) => language.code));

export function isSupportedLanguageCode(value: string | null): value is LanguageCode {
  return Boolean(value && supportedLanguageCodes.has(value as LanguageCode));
}

export function getStoredOutputLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en";

  const storedOutputLanguage = window.localStorage.getItem("idp_language");
  if (isSupportedLanguageCode(storedOutputLanguage)) {
    return storedOutputLanguage;
  }

  const storedInterfaceLanguage = window.localStorage.getItem("preferredLanguage");
  return isSupportedLanguageCode(storedInterfaceLanguage) ? storedInterfaceLanguage : "en";
}

export function getLanguageLabel(code: string | undefined) {
  return languageOptions.find((language) => language.code === code)?.label || "English";
}

export function applyLanguagePreference(
  code: LanguageCode,
  i18n: { changeLanguage: (language: string) => unknown }
) {
  window.localStorage.setItem("idp_language", code);
  window.localStorage.setItem("preferredLanguage", code);
  i18n.changeLanguage(code);
}

type LanguageSelectorProps = {
  selectedLanguage: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  align?: "start" | "center" | "end";
  className?: string;
};

export default function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  align = "end",
  className,
}: LanguageSelectorProps) {
  const { t } = useTranslation();
  const currentLanguage =
    languageOptions.find((language) => language.code === selectedLanguage) || languageOptions[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          title={t("currentLanguage", { language: currentLanguage.label })}
        >
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLanguage.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-72 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel>{t("chooseLanguage")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={selectedLanguage}
          onValueChange={(value) => {
            if (isSupportedLanguageCode(value)) {
              onLanguageChange(value);
            }
          }}
        >
          {languageOptions.map((language) => (
            <DropdownMenuRadioItem key={language.code} value={language.code} className="items-start">
              <span className="flex min-w-0 flex-col break-words leading-snug">
                <span className="font-medium">{language.label}</span>
                <span className="text-xs text-muted-foreground">
                  {language.nativeLabel} · {language.region}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
