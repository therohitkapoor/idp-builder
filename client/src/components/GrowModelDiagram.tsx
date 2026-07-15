import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Eye, TrendingUp, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

interface GrowModelProps {
  goal: string;
  reality: string;
  options: string[];
  willDo: string[];
}

export function GrowModelDiagram({ goal, reality, options, willDo }: GrowModelProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const steps = [
    {
      letter: "G",
      title: t('growGoal'),
      description: goal,
      icon: Target,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-700",
    },
    {
      letter: "R",
      title: t('growReality'),
      description: reality,
      icon: Eye,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
    },
    {
      letter: "O",
      title: t('growOptions'),
      description: options,
      icon: TrendingUp,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
    },
    {
      letter: "W",
      title: t('growWillDo'),
      description: willDo,
      icon: Zap,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
    },
  ];

  return (
    <Card className="border-2 border-primary/20 shadow-lg" dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 text-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span className="text-emeritus-green">{t('growModel')}</span>
          <Badge variant="outline" className="text-xs">{t('coachingFramework')}</Badge>
        </CardTitle>
        <p className={`text-sm text-muted-foreground mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('growModelDescription')}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isArray = Array.isArray(step.description);
            
            return (
              <div
                key={index}
                className="relative group"
              >
                {/* Connector line for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-border to-transparent z-0" />
                )}
                
                <div className={`${step.bgColor} rounded-xl p-6 border-2 border-border hover:border-primary transition-all duration-300 hover:shadow-md h-full`}>
                  <div className="flex items-start gap-4">
                    {/* Letter Badge */}
                    <div className={`flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                      {step.letter}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`h-5 w-5 ${step.textColor}`} />
                        <h3 className={`font-bold text-lg ${step.textColor}`}>
                          {step.title}
                        </h3>
                      </div>
                      
                      {isArray ? (
                        <ul className="space-y-2 text-sm text-foreground">
                          {(step.description as string[]).map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className={`${step.textColor} font-bold mt-0.5`}>•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-foreground leading-relaxed">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Bottom note */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <p className={`text-sm text-muted-foreground text-center ${isRTL ? 'text-right' : 'text-left'}`}>
            <span className="font-semibold text-foreground">{t('growTip')}</span> {t('growTipDescription')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
