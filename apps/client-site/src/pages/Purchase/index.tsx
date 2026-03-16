import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Shield,
  ArrowLeft,
  CreditCard,
  Bitcoin,
  FileText,
  Check,
  Lock,
  Zap,
  Headphones,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  price: number;
  label: string;
  duration: string;
  features: string[];
  badge: string | null;
  badgeColor: string;
  popular: boolean;
}

const plans: Plan[] = [
  {
    id: "trial",
    name: "\u041F\u0440\u043E\u0431\u043D\u044B\u0439",
    price: 0,
    label: "\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E",
    duration: "1 \u0434\u0435\u043D\u044C",
    features: [
      "1 \u0413\u0411 \u0442\u0440\u0430\u0444\u0438\u043A\u0430",
      "1 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E",
      "\u0412\u0441\u0435 \u043F\u0440\u043E\u0442\u043E\u043A\u043E\u043B\u044B",
    ],
    badge: null,
    badgeColor: "",
    popular: false,
  },
  {
    id: "monthly",
    name: "\u041C\u0435\u0441\u044F\u0447\u043D\u044B\u0439",
    price: 199,
    label: "199\u20BD",
    duration: "30 \u0434\u043D\u0435\u0439",
    features: [
      "\u0411\u0435\u0437\u043B\u0438\u043C\u0438\u0442\u043D\u044B\u0439 \u0442\u0440\u0430\u0444\u0438\u043A",
      "3 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430",
      "\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442\u043D\u0430\u044F \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430",
    ],
    badge: "\u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u044B\u0439",
    badgeColor: "bg-emerald-500 text-black",
    popular: true,
  },
  {
    id: "yearly",
    name: "\u0413\u043E\u0434\u043E\u0432\u043E\u0439",
    price: 1790,
    label: "1790\u20BD",
    duration: "365 \u0434\u043D\u0435\u0439 \u00b7 \u0441\u043A\u0438\u0434\u043A\u0430 25%",
    features: [
      "\u0411\u0435\u0437\u043B\u0438\u043C\u0438\u0442\u043D\u044B\u0439 \u0442\u0440\u0430\u0444\u0438\u043A",
      "5 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432",
      "\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442\u043D\u0430\u044F \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430",
    ],
    badge: "\u0412\u044B\u0433\u043E\u0434\u043D\u043E",
    badgeColor: "bg-blue-500 text-white",
    popular: false,
  },
];

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: typeof CreditCard;
  color: string;
  bgColor: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: "yookassa",
    name: "YooKassa",
    description: "\u041A\u0430\u0440\u0442\u044B, \u0421\u0411\u041F, \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0438",
    icon: CreditCard,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "cryptobot",
    name: "CryptoBot",
    description: "BTC, ETH, USDT, TON",
    icon: Bitcoin,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "manual",
    name: "\u041F\u0435\u0440\u0435\u0432\u043E\u0434",
    description: "\u0411\u0430\u043D\u043A\u043E\u0432\u0441\u043A\u0438\u0439 \u043F\u0435\u0440\u0435\u0432\u043E\u0434",
    icon: FileText,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
];

export default function Purchase() {
  const [searchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [selectedPayment, setSelectedPayment] = useState("yookassa");
  const [email, setEmail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [emailError, setEmailError] = useState(false);

  useEffect(() => {
    const planParam = searchParams.get("plan");
    if (planParam && plans.some((p) => p.id === planParam)) {
      setSelectedPlan(planParam);
    }
  }, [searchParams]);

  const currentPlan = plans.find((p) => p.id === selectedPlan)!;

  const handlePay = () => {
    if (!email.trim()) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    setProcessing(true);

    // Mock payment flow
    setTimeout(() => {
      setProcessing(false);
      alert(
        `\u041F\u0435\u0440\u0435\u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043D\u0430 ${paymentMethods.find((m) => m.id === selectedPayment)?.name}\n\n\u0422\u0430\u0440\u0438\u0444: ${currentPlan.name}\n\u0421\u0443\u043C\u043C\u0430: ${currentPlan.label}\nEmail: ${email}`,
      );
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-[hsl(var(--background))]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            <span className="text-lg font-extrabold tracking-tight">
              ProxyForge
            </span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            \u041D\u0430\u0437\u0430\u0434
          </Link>
        </div>
      </nav>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1fr_380px]">
        {/* Main */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u0430\u0440\u0438\u0444
          </h1>
          <p className="mb-8 text-sm text-muted-foreground">
            \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u043B\u0430\u043D \u0438 \u0441\u043F\u043E\u0441\u043E\u0431 \u043E\u043F\u043B\u0430\u0442\u044B
          </p>

          {/* Step 1: Plan */}
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-400">
              1
            </span>
            \u0422\u0430\u0440\u0438\u0444\u043D\u044B\u0439 \u043F\u043B\u0430\u043D
          </div>
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  "relative cursor-pointer transition-all",
                  selectedPlan === plan.id
                    ? "border-emerald-500 bg-emerald-500/5"
                    : "hover:border-emerald-500/30",
                )}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.badge && (
                  <div
                    className={cn(
                      "absolute -top-2.5 right-3 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                      plan.badgeColor,
                    )}
                  >
                    {plan.badge}
                  </div>
                )}
                <CardContent className="p-5">
                  {/* Radio indicator */}
                  <div className="absolute right-5 top-5">
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors",
                        selectedPlan === plan.id
                          ? "border-emerald-500"
                          : "border-border",
                      )}
                    >
                      {selectedPlan === plan.id && (
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                  </div>

                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    {plan.name}
                  </p>
                  <p className="mb-1 text-2xl font-extrabold tracking-tight">
                    {plan.price === 0 ? (
                      "\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E"
                    ) : (
                      <>
                        {plan.price}
                        <span className="text-sm font-medium text-muted-foreground">
                          \u20BD
                        </span>
                      </>
                    )}
                  </p>
                  <p className="mb-4 text-xs text-muted-foreground">
                    {plan.duration}
                  </p>
                  <ul className="space-y-1.5 border-t border-border pt-4">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <Check className="h-3 w-3 shrink-0 text-emerald-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Step 2: Payment */}
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-400">
              2
            </span>
            \u0421\u043F\u043E\u0441\u043E\u0431 \u043E\u043F\u043B\u0430\u0442\u044B
          </div>
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            {paymentMethods.map((method) => (
              <Card
                key={method.id}
                className={cn(
                  "cursor-pointer text-center transition-all",
                  selectedPayment === method.id
                    ? "border-emerald-500 bg-emerald-500/5"
                    : "hover:border-emerald-500/30",
                )}
                onClick={() => setSelectedPayment(method.id)}
              >
                <CardContent className="p-5">
                  <div
                    className={cn(
                      "mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl",
                      method.bgColor,
                    )}
                  >
                    <method.icon className={cn("h-6 w-6", method.color)} />
                  </div>
                  <p className="text-sm font-semibold">{method.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {method.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Step 3: Email */}
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-400">
              3
            </span>
            \u041A\u043E\u043D\u0442\u0430\u043A\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435
          </div>
          <div className="mb-8">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(false);
              }}
              className={cn(
                "h-11",
                emailError && "border-red-500 focus-visible:ring-red-500",
              )}
            />
            <p className="mt-2 text-[10px] text-muted-foreground">
              \u041C\u044B \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u043C \u0442\u043E\u043A\u0435\u043D \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438 \u043D\u0430 \u044D\u0442\u043E\u0442 \u0430\u0434\u0440\u0435\u0441
            </p>
          </div>
        </div>

        {/* Order Sidebar */}
        <div className="lg:sticky lg:top-24">
          <Card>
            <CardContent className="p-7">
              <h3 className="mb-6 border-b border-border pb-4 text-sm font-bold">
                \u0418\u0442\u043E\u0433\u043E
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    \u0422\u0430\u0440\u0438\u0444
                  </span>
                  <span className="font-semibold">{currentPlan.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    \u041F\u0435\u0440\u0438\u043E\u0434
                  </span>
                  <span className="font-semibold">{currentPlan.duration}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    \u041E\u043F\u043B\u0430\u0442\u0430
                  </span>
                  <span className="font-semibold">
                    {paymentMethods.find((m) => m.id === selectedPayment)?.name}
                  </span>
                </div>
              </div>

              <div className="my-5 border-t border-border" />

              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  \u0418\u0442\u043E\u0433\u043E
                </span>
                <span className="text-2xl font-extrabold text-emerald-400">
                  {currentPlan.label}
                </span>
              </div>

              <Button
                className="mt-6 h-12 w-full gap-2 text-base"
                onClick={handlePay}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    \u041E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430...
                  </>
                ) : currentPlan.price === 0 ? (
                  <>
                    \u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    \u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C {currentPlan.label}
                  </>
                )}
              </Button>

              <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                <Lock className="h-3 w-3" />
                \u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u0430\u044F \u043E\u043F\u043B\u0430\u0442\u0430
              </p>

              <ul className="mt-5 space-y-2 border-t border-border pt-5">
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  \u041C\u043E\u043C\u0435\u043D\u0442\u0430\u043B\u044C\u043D\u0430\u044F \u0430\u043A\u0442\u0438\u0432\u0430\u0446\u0438\u044F
                </li>
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  \u0412\u0441\u0435 \u043F\u0440\u043E\u0442\u043E\u043A\u043E\u043B\u044B \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u044B
                </li>
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Headphones className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  \u041F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430 24/7 \u0432 Telegram
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
