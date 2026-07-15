import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { isSupportedLanguageCode, type LanguageCode } from "@/components/LanguageSelector";
import { translateReportText } from "@/lib/reportTranslation";

export function useAutoTranslatedText() {
  const { i18n } = useTranslation();
  const language = (i18n.language.split("-")[0] || "en") as LanguageCode;
  const activeLanguage = isSupportedLanguageCode(language) ? language : "en";

  return useMemo(
    () => (value: string) => (activeLanguage === "en" ? value : translateReportText(value, activeLanguage)),
    [activeLanguage]
  );
}
