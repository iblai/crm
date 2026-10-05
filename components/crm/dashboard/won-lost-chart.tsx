"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/crm/format";
import { useCrmEnums } from "@/lib/crm/i18n";

export interface MonthDatum {
  key: string;
  label: string;
  won: number;
  lost: number;
  wonValue: number;
  lostValue: number;
}

/** Closed deals of the last six months, won beside lost. */
export function WonLostChart({ data, currency }: { data: MonthDatum[]; currency: string }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { dealStatus } = useCrmEnums();
  const empty = data.every((d) => d.won === 0 && d.lost === 0);
  if (empty) {
    return (
      <p className="text-muted-foreground flex h-56 items-center justify-center text-sm">
        {t("panels.wonLost.empty")}
      </p>
    );
  }
  return (
    <div className="h-56 w-full min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barGap={4}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#6b7280" }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            width={40}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,88,204,0.06)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as MonthDatum;
              return (
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-gray-900">{d.label}</p>
                  <p className="text-emerald-600">
                    {t("panels.wonLost.wonDetail", {
                      count: d.won,
                      value: formatCurrency(d.wonValue, currency, locale),
                    })}
                  </p>
                  <p className="text-rose-600">
                    {t("panels.wonLost.lostDetail", {
                      count: d.lost,
                      value: formatCurrency(d.lostValue, currency, locale),
                    })}
                  </p>
                </div>
              );
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={24}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: "#6b7280" }}
          />
          <Bar
            isAnimationActive={false}
            dataKey="won"
            name={dealStatus("won")}
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
          />
          <Bar
            isAnimationActive={false}
            dataKey="lost"
            name={dealStatus("lost")}
            fill="#fb7185"
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
