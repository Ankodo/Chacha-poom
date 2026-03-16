import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ServerInfo {
  id: string;
  country: string;
  city: string;
  flag: string;
  latency: number | null;
  status: "online" | "offline" | "maintenance";
  load: number;
  userCount: number;
}

const servers: ServerInfo[] = [
  {
    id: "de-fra-1",
    country: "\u0413\u0435\u0440\u043C\u0430\u043D\u0438\u044F",
    city: "\u0424\u0440\u0430\u043D\u043A\u0444\u0443\u0440\u0442",
    flag: "\uD83C\uDDE9\uD83C\uDDEA",
    latency: 12,
    status: "online",
    load: 23,
    userCount: 142,
  },
  {
    id: "nl-ams-1",
    country: "\u041D\u0438\u0434\u0435\u0440\u043B\u0430\u043D\u0434\u044B",
    city: "\u0410\u043C\u0441\u0442\u0435\u0440\u0434\u0430\u043C",
    flag: "\uD83C\uDDF3\uD83C\uDDF1",
    latency: 18,
    status: "online",
    load: 41,
    userCount: 98,
  },
  {
    id: "fi-hel-1",
    country: "\u0424\u0438\u043D\u043B\u044F\u043D\u0434\u0438\u044F",
    city: "\u0425\u0435\u043B\u044C\u0441\u0438\u043D\u043A\u0438",
    flag: "\uD83C\uDDEB\uD83C\uDDEE",
    latency: 25,
    status: "online",
    load: 15,
    userCount: 67,
  },
  {
    id: "pl-waw-1",
    country: "\u041F\u043E\u043B\u044C\u0448\u0430",
    city: "\u0412\u0430\u0440\u0448\u0430\u0432\u0430",
    flag: "\uD83C\uDDF5\uD83C\uDDF1",
    latency: 22,
    status: "online",
    load: 38,
    userCount: 85,
  },
  {
    id: "ro-buc-1",
    country: "\u0420\u0443\u043C\u044B\u043D\u0438\u044F",
    city: "\u0411\u0443\u0445\u0430\u0440\u0435\u0441\u0442",
    flag: "\uD83C\uDDF7\uD83C\uDDF4",
    latency: 30,
    status: "online",
    load: 19,
    userCount: 54,
  },
  {
    id: "se-sto-1",
    country: "\u0428\u0432\u0435\u0446\u0438\u044F",
    city: "\u0421\u0442\u043E\u043A\u0433\u043E\u043B\u044C\u043C",
    flag: "\uD83C\uDDF8\uD83C\uDDEA",
    latency: null,
    status: "maintenance",
    load: 0,
    userCount: 0,
  },
  {
    id: "lt-vil-1",
    country: "\u041B\u0438\u0442\u0432\u0430",
    city: "\u0412\u0438\u043B\u044C\u043D\u044E\u0441",
    flag: "\uD83C\uDDF1\uD83C\uDDF9",
    latency: 28,
    status: "online",
    load: 12,
    userCount: 34,
  },
  {
    id: "bg-sof-1",
    country: "\u0411\u043E\u043B\u0433\u0430\u0440\u0438\u044F",
    city: "\u0421\u043E\u0444\u0438\u044F",
    flag: "\uD83C\uDDE7\uD83C\uDDEC",
    latency: 35,
    status: "online",
    load: 8,
    userCount: 21,
  },
  {
    id: "md-chi-1",
    country: "\u041C\u043E\u043B\u0434\u043E\u0432\u0430",
    city: "\u041A\u0438\u0448\u0438\u043D\u0451\u0432",
    flag: "\uD83C\uDDF2\uD83C\uDDE9",
    latency: 33,
    status: "online",
    load: 5,
    userCount: 15,
  },
];

// Group servers by country
const grouped = servers.reduce<Record<string, ServerInfo[]>>((acc, s) => {
  if (!acc[s.country]) acc[s.country] = [];
  acc[s.country]!.push(s);
  return acc;
}, {});

export default function Servers() {
  const [selectedId, setSelectedId] = useState<string>("de-fra-1");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          \u0421\u0435\u0440\u0432\u0435\u0440\u044B
        </h1>
        <p className="text-sm text-muted-foreground">
          \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0440\u0435\u0434\u043F\u043E\u0447\u0442\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0441\u0435\u0440\u0432\u0435\u0440
        </p>
      </div>

      {Object.entries(grouped).map(([country, countryServers]) => (
        <div key={country}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <span className="text-base">{countryServers[0]?.flag}</span>
            {country}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {countryServers.map((server) => (
              <Card
                key={server.id}
                className={cn(
                  "cursor-pointer transition-all",
                  server.status === "maintenance"
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-emerald-500/30",
                  selectedId === server.id &&
                    server.status !== "maintenance" &&
                    "border-emerald-500 bg-emerald-500/5",
                )}
                onClick={() => {
                  if (server.status !== "maintenance") {
                    setSelectedId(server.id);
                  }
                }}
              >
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{server.flag}</span>
                      <div>
                        <p className="text-sm font-semibold">{server.city}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {server.country}
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        server.status === "online"
                          ? "bg-emerald-400"
                          : server.status === "maintenance"
                            ? "bg-yellow-400"
                            : "bg-red-400",
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {server.latency !== null ? (
                        <Badge
                          variant={
                            server.latency <= 20
                              ? "success"
                              : server.latency <= 30
                                ? "warning"
                                : "info"
                          }
                          className="text-[10px]"
                        >
                          {server.latency}ms
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          --
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {server.status === "maintenance"
                          ? "\u041E\u0431\u0441\u043B\u0443\u0436\u0438\u0432\u0430\u043D\u0438\u0435"
                          : `${server.load}% \u043D\u0430\u0433\u0440\u0443\u0437\u043A\u0430`}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {server.userCount > 0
                        ? `${server.userCount} \u043F\u043E\u043B\u044C\u0437.`
                        : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
