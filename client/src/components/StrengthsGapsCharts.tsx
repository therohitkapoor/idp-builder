import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StrengthGap = {
  area: string;
  score: number;
};

type StrengthsGapsChartsProps = {
  strengths: StrengthGap[];
  gaps: StrengthGap[];
  strengthColors: string[];
  gapColors: string[];
  isRTL: boolean;
  labels: {
    keyStrengthAreas: string;
    keyDevelopmentGaps: string;
    noStrengthData: string;
    noGapData: string;
  };
};

export default function StrengthsGapsCharts({
  strengths,
  gaps,
  strengthColors,
  gapColors,
  isRTL,
  labels,
}: StrengthsGapsChartsProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <TrendingUp className="h-5 w-5" />
            {labels.keyStrengthAreas}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {strengths.length > 0 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={strengths}
                  layout="vertical"
                  margin={isRTL ? { top: 10, right: 20, left: 40, bottom: 10 } : { top: 10, right: 40, left: 20, bottom: 10 }}
                >
                  <defs>
                    {strengths.map((_, index) => (
                      <linearGradient key={`strength-gradient-${index}`} id={`strengthGradient${index}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={strengthColors[index % strengthColors.length]} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={strengthColors[index % strengthColors.length]} stopOpacity={1} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    reversed={isRTL}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    dataKey="area"
                    type="category"
                    width={120}
                    orientation={isRTL ? "right" : "left"}
                    tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    formatter={(value: number) => `${value}%`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    cursor={false}
                    labelFormatter={() => ""}
                  />
                  <Bar
                    dataKey="score"
                    radius={isRTL ? [8, 0, 0, 8] : [0, 8, 8, 0]}
                    animationDuration={800}
                    animationBegin={0}
                  >
                    {strengths.map((_, index) => (
                      <Cell key={`strength-cell-${index}`} fill={`url(#strengthGradient${index})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">{labels.noStrengthData}</p>
          )}
        </CardContent>
      </Card>

      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <TrendingDown className="h-5 w-5" />
            {labels.keyDevelopmentGaps}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gaps.length > 0 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={gaps}
                  layout="vertical"
                  margin={isRTL ? { top: 10, right: 20, left: 40, bottom: 10 } : { top: 10, right: 40, left: 20, bottom: 10 }}
                >
                  <defs>
                    {gaps.map((_, index) => (
                      <linearGradient key={`gap-gradient-${index}`} id={`gapGradient${index}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={gapColors[index % gapColors.length]} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={gapColors[index % gapColors.length]} stopOpacity={1} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    reversed={isRTL}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    dataKey="area"
                    type="category"
                    width={120}
                    orientation={isRTL ? "right" : "left"}
                    tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    formatter={(value: number) => `${value}%`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    cursor={false}
                    labelFormatter={() => ""}
                  />
                  <Bar
                    dataKey="score"
                    radius={isRTL ? [8, 0, 0, 8] : [0, 8, 8, 0]}
                    animationDuration={800}
                    animationBegin={0}
                  >
                    {gaps.map((_, index) => (
                      <Cell key={`gap-cell-${index}`} fill={`url(#gapGradient${index})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">{labels.noGapData}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
