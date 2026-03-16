import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  Zap,
  Globe,
  HeadphonesIcon,
  Check,
  ChevronDown,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const features = [
  {
    icon: Zap,
    title: "Молниеносная скорость",
    desc: "Протокол Hysteria2 на базе QUIC обеспечивает скорость до 1 Гбит/с с минимальной задержкой.",
  },
  {
    icon: Shield,
    title: "Полная защита",
    desc: "VLESS Reality делает ваш трафик неотличимым от обычных HTTPS-запросов для систем DPI.",
  },
  {
    icon: Globe,
    title: "Множество протоколов",
    desc: "Reality, Hysteria2, WebSocket+CDN, Trojan — выбирайте оптимальный под вашу задачу.",
  },
  {
    icon: HeadphonesIcon,
    title: "Поддержка 24/7",
    desc: "Оперативная помощь через Telegram-бот. Настройка за 2 минуты на любом устройстве.",
  },
];

const plans = [
  {
    id: "trial",
    name: "Пробный",
    price: "0",
    currency: "",
    period: "1 день",
    features: [
      "1 ГБ трафика",
      "1 устройство",
      "Все протоколы",
      "Все локации",
    ],
    cta: "Попробовать бесплатно",
    popular: false,
    badge: null,
  },
  {
    id: "monthly",
    name: "Месячный",
    price: "199",
    currency: "\u20BD",
    period: "30 дней",
    features: [
      "Безлимитный трафик",
      "3 устройства",
      "Все протоколы",
      "Все локации",
      "Приоритетная поддержка",
    ],
    cta: "Купить",
    popular: true,
    badge: "Популярный",
  },
  {
    id: "yearly",
    name: "Годовой",
    price: "1790",
    currency: "\u20BD",
    period: "365 дней",
    features: [
      "Безлимитный трафик",
      "5 устройств",
      "Все протоколы",
      "Все локации",
      "Приоритетная поддержка",
    ],
    cta: "Купить",
    popular: false,
    badge: "Выгодно",
  },
];

const faqItems = [
  {
    q: "Какие протоколы поддерживаются?",
    a: "ProxyForge поддерживает VLESS + Reality, VLESS + WebSocket + CDN, Hysteria2 (QUIC) и Trojan + CDN. Все протоколы доступны на любом тарифном плане. Рекомендуем VLESS + Reality для максимальной скрытности, а Hysteria2 для максимальной скорости.",
  },
  {
    q: "Работает ли сервис в условиях ограничений?",
    a: "Да, ProxyForge специально разработан для работы в условиях сетевых ограничений. Протокол Reality маскирует трафик под обычные HTTPS-запросы, а CDN-варианты обеспечивают работу даже при блокировке прямых IP-адресов серверов.",
  },
  {
    q: "Как настроить на телефоне?",
    a: "Для Android рекомендуем v2rayNG или Hiddify, для iOS — Streisand или V2Box. После покупки подписки вы получите ссылку, которую нужно добавить в приложение. Подробные инструкции доступны в личном кабинете.",
  },
  {
    q: "Есть ли пробный период?",
    a: "Да, мы предлагаем бесплатный пробный период на 1 день с лимитом 1 ГБ трафика и подключением 1 устройства. Это позволит вам протестировать все протоколы перед покупкой.",
  },
  {
    q: "Какие способы оплаты доступны?",
    a: "Мы принимаем банковские карты и СБП через YooKassa, а также криптовалюту (BTC, ETH, USDT, TON) через CryptoBot. Активация происходит мгновенно после оплаты.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 bg-card px-6 py-5 text-left text-sm font-medium transition-colors hover:bg-accent"
      >
        <span>{q}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-[hsl(var(--background))]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            <span className="text-lg font-extrabold tracking-tight">
              ProxyForge
            </span>
          </Link>
          <ul className="hidden items-center gap-8 md:flex">
            <li>
              <a
                href="#features"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Возможности
              </a>
            </li>
            <li>
              <a
                href="#pricing"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Тарифы
              </a>
            </li>
            <li>
              <a
                href="#faq"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                FAQ
              </a>
            </li>
            <li>
              {isAuthenticated ? (
                <Button size="sm" onClick={() => navigate("/console")}>
                  Кабинет
                </Button>
              ) : (
                <Button size="sm" onClick={() => navigate("/purchase")}>
                  Начать
                </Button>
              )}
            </li>
          </ul>
          <button
            className="text-muted-foreground md:hidden"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
        {mobileMenu && (
          <div className="border-t border-border bg-[hsl(var(--background))]/95 px-6 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <a
                href="#features"
                className="text-sm text-muted-foreground"
                onClick={() => setMobileMenu(false)}
              >
                Возможности
              </a>
              <a
                href="#pricing"
                className="text-sm text-muted-foreground"
                onClick={() => setMobileMenu(false)}
              >
                Тарифы
              </a>
              <a
                href="#faq"
                className="text-sm text-muted-foreground"
                onClick={() => setMobileMenu(false)}
              >
                FAQ
              </a>
              <Button
                size="sm"
                className="mt-2"
                onClick={() => {
                  setMobileMenu(false);
                  navigate(isAuthenticated ? "/console" : "/purchase");
                }}
              >
                {isAuthenticated ? "Кабинет" : "Начать"}
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-40 pb-28">
        <div className="pointer-events-none absolute -top-48 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
        <motion.div
          className="relative mx-auto max-w-3xl px-6 text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-400"
          >
            <Shield className="h-3.5 w-3.5" />
            Multi-protocol VPN
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
          >
            <span className="block">Безопасный интернет</span>
            <span className="block text-emerald-400">без ограничений</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground"
          >
            Мультипротокольный VPN с Reality, Hysteria2 и поддержкой CDN.
            Оставайтесь на связи всегда и везде.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Button
              size="xl"
              onClick={() => navigate("/purchase")}
              className="gap-2"
            >
              Начать
              <ArrowRight className="h-4 w-4" />
            </Button>
            {isAuthenticated && (
              <Button
                size="xl"
                variant="outline"
                onClick={() => navigate("/console")}
              >
                Личный кабинет
              </Button>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            className="mb-16 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
          >
            <h2 className="text-3xl font-bold tracking-tight">
              Почему ProxyForge?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Создан для безопасности, оптимизирован для скорости
            </p>
          </motion.div>
          <motion.div
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="group rounded-xl border border-border bg-card p-7 transition-colors hover:border-emerald-500/30"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-sm font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-white/[0.01]">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            className="mb-16 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
          >
            <h2 className="text-3xl font-bold tracking-tight">Тарифы</h2>
            <p className="mt-3 text-muted-foreground">
              Выберите подходящий план
            </p>
          </motion.div>
          <motion.div
            className="grid gap-5 sm:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                variants={fadeUp}
                className={cn(
                  "relative rounded-xl border bg-card p-7 transition-colors",
                  plan.popular
                    ? "border-emerald-500 shadow-[0_0_40px_rgba(34,197,94,0.1)]"
                    : "border-border hover:border-emerald-500/30",
                )}
              >
                {plan.badge && (
                  <div
                    className={cn(
                      "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                      plan.popular
                        ? "bg-emerald-500 text-black"
                        : "bg-blue-500 text-white",
                    )}
                  >
                    {plan.badge}
                  </div>
                )}
                <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {plan.name}
                </div>
                <div className="mb-1 text-4xl font-extrabold tracking-tight">
                  {plan.price === "0" ? (
                    "Бесплатно"
                  ) : (
                    <>
                      {plan.price}
                      <span className="text-base font-medium text-muted-foreground">
                        {plan.currency}
                      </span>
                    </>
                  )}
                </div>
                <div className="mb-6 text-sm text-muted-foreground">
                  {plan.period}
                </div>
                <ul className="mb-7 space-y-2.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-sm text-muted-foreground"
                    >
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() =>
                    navigate(`/purchase?plan=${plan.id}`)
                  }
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="mx-auto max-w-2xl px-6">
          <motion.div
            className="mb-16 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
          >
            <h2 className="text-3xl font-bold tracking-tight">
              Часто задаваемые вопросы
            </h2>
            <p className="mt-3 text-muted-foreground">
              Ответы на популярные вопросы
            </p>
          </motion.div>
          <motion.div
            className="space-y-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
          >
            {faqItems.map((item) => (
              <motion.div key={item.q} variants={fadeUp}>
                <FAQItem q={item.q} a={item.a} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6">
          <span className="text-xs text-muted-foreground">
            &copy; 2026 ProxyForge. Все права защищены.
          </span>
          <div className="flex items-center gap-6">
            <a
              href="https://t.me/proxyforge"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Telegram
            </a>
            <a
              href="mailto:support@proxyforge.io"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Поддержка
            </a>
            <Link
              to="/purchase"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Купить
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
