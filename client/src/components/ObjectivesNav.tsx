import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Circle, Clock, MessageSquare } from "lucide-react";
import type { ObjectiveProgressStatus } from "@shared/idpEnterprise";
import { useTranslation } from "react-i18next";

interface Objective {
  title: string;
  criticality: "low" | "medium" | "high" | "critical";
  status: ObjectiveProgressStatus;
  progress: number;
}

interface ObjectivesNavProps {
  objectives: Objective[];
  onObjectiveClick: (index: number) => void;
}

const criticalityColors = {
  low: "bg-blue-100 text-blue-800 border-blue-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  critical: "bg-red-100 text-red-800 border-red-300",
};

const statusIcons = {
  not_started: Circle,
  in_progress: Clock,
  blocked: AlertCircle,
  completed: CheckCircle2,
  revised: MessageSquare,
};

export function ObjectivesNav({ objectives, onObjectiveClick }: ObjectivesNavProps) {
  const { t } = useTranslation();
  
  return (
    <Card className="sticky top-4 h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t("objectivesNavigator")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-2 p-4 pt-0">
            {objectives.map((objective, index) => {
              const StatusIcon = statusIcons[objective.status];
              return (
                <button
                  key={index}
                  onClick={() => onObjectiveClick(index)}
                  className="w-full text-left p-3 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-all duration-200 group"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-primary text-sm">{index + 1}.</span>
	                      <StatusIcon className={`h-4 w-4 ${
	                        objective.status === "completed" ? "text-green-600" :
	                        objective.status === "in_progress" ? "text-blue-600" :
	                        objective.status === "blocked" ? "text-red-600" :
	                        objective.status === "revised" ? "text-amber-600" :
	                        "text-muted-foreground"
	                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {objective.title}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${criticalityColors[objective.criticality]}`}
                        >
                          {t(objective.criticality)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {objective.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
