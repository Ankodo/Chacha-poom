import * as React from "react";
import {
  Settings as SettingsIcon,
  Bot,
  CreditCard,
  Shield,
  Database,
  Loader2,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Toggle switch component (inline, dark-theme friendly)
// ---------------------------------------------------------------------------
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-green-600" : "bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section navigation
// ---------------------------------------------------------------------------
const SECTIONS = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "telegram", label: "Telegram Bot", icon: Bot },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
  { id: "backup", label: "Backup", icon: Database },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function Settings() {
  const [activeSection, setActiveSection] = React.useState<SectionId>("general");

  // General
  const [serviceName, setServiceName] = React.useState("ProxyForge");
  const [domain, setDomain] = React.useState("");
  const [subLinkDomain, setSubLinkDomain] = React.useState("");
  const [darkTheme, setDarkTheme] = React.useState(true);

  // Telegram
  const [botToken, setBotToken] = React.useState("");
  const [showBotToken, setShowBotToken] = React.useState(false);
  const [botUsername, setBotUsername] = React.useState("@proxyforge_bot");
  const [testingConnection, setTestingConnection] = React.useState(false);
  const [connectionStatus, setConnectionStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle");

  // Payment
  const [yooShopId, setYooShopId] = React.useState("");
  const [yooSecretKey, setYooSecretKey] = React.useState("");
  const [showYooSecret, setShowYooSecret] = React.useState(false);
  const [cryptoBotToken, setCryptoBotToken] = React.useState("");
  const [showCryptoToken, setShowCryptoToken] = React.useState(false);
  const [yooEnabled, setYooEnabled] = React.useState(true);
  const [cryptoEnabled, setCryptoEnabled] = React.useState(false);

  // Security
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [twoFaEnabled, setTwoFaEnabled] = React.useState(false);
  const [apiToken] = React.useState(
    "pf_sk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
  );
  const [tokenCopied, setTokenCopied] = React.useState(false);

  // Backup
  const [lastBackup] = React.useState("2026-03-13 22:30 UTC");
  const [autoBackup, setAutoBackup] = React.useState(true);
  const [backupInterval, setBackupInterval] = React.useState("daily");
  const [creatingBackup, setCreatingBackup] = React.useState(false);

  // Saving state per section
  const [saving, setSaving] = React.useState<Record<string, boolean>>({});

  const handleSave = (section: string) => {
    setSaving((s) => ({ ...s, [section]: true }));
    // Simulate API call
    setTimeout(() => {
      setSaving((s) => ({ ...s, [section]: false }));
    }, 1000);
  };

  const handleTestConnection = () => {
    setTestingConnection(true);
    setConnectionStatus("idle");
    setTimeout(() => {
      setTestingConnection(false);
      setConnectionStatus(botToken ? "success" : "error");
    }, 1500);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(apiToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const handleCreateBackup = () => {
    setCreatingBackup(true);
    setTimeout(() => setCreatingBackup(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your application configuration.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeSection === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* General Settings */}
      {/* ----------------------------------------------------------------- */}
      {activeSection === "general" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-muted-foreground" />
              General Settings
            </CardTitle>
            <CardDescription>
              Core application settings and appearance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Service Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Name</label>
              <Input
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="ProxyForge"
              />
              <p className="text-xs text-muted-foreground">
                Displayed in the panel header and Telegram bot.
              </p>
            </div>

            {/* Domain */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Domain</label>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="panel.example.com"
              />
            </div>

            {/* Sub-link Domain */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sub-link Domain</label>
              <Input
                value={subLinkDomain}
                onChange={(e) => setSubLinkDomain(e.target.value)}
                placeholder="sub.example.com"
              />
              <p className="text-xs text-muted-foreground">
                Domain used for subscription links.
              </p>
            </div>

            {/* Theme toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                {darkTheme ? (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {darkTheme ? "Dark Theme" : "Light Theme"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Toggle between dark and light appearance.
                  </p>
                </div>
              </div>
              <Toggle checked={darkTheme} onChange={setDarkTheme} />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => handleSave("general")}
                disabled={saving.general}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saving.general ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Telegram Bot */}
      {/* ----------------------------------------------------------------- */}
      {activeSection === "telegram" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-muted-foreground" />
              Telegram Bot
            </CardTitle>
            <CardDescription>
              Configure the Telegram bot integration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bot Token */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Bot Token</label>
              <div className="relative">
                <Input
                  type={showBotToken ? "text" : "password"}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowBotToken(!showBotToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showBotToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Bot Username */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Bot Username</label>
              <Input value={botUsername} readOnly className="opacity-70" />
            </div>

            {/* Test Connection */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
              {connectionStatus === "success" && (
                <span className="flex items-center gap-1 text-sm text-green-500">
                  <Check className="h-4 w-4" />
                  Connected
                </span>
              )}
              {connectionStatus === "error" && (
                <span className="text-sm text-red-400">
                  Connection failed
                </span>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => handleSave("telegram")}
                disabled={saving.telegram}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saving.telegram ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Payment Settings */}
      {/* ----------------------------------------------------------------- */}
      {activeSection === "payment" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              Payment Settings
            </CardTitle>
            <CardDescription>
              Configure payment gateways and methods.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* YooKassa */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">YooKassa</h3>
                <Toggle checked={yooEnabled} onChange={setYooEnabled} />
              </div>

              <div className="space-y-4 pl-1">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Shop ID</label>
                  <Input
                    value={yooShopId}
                    onChange={(e) => setYooShopId(e.target.value)}
                    placeholder="123456"
                    disabled={!yooEnabled}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Secret Key</label>
                  <div className="relative">
                    <Input
                      type={showYooSecret ? "text" : "password"}
                      value={yooSecretKey}
                      onChange={(e) => setYooSecretKey(e.target.value)}
                      placeholder="live_..."
                      className="pr-10"
                      disabled={!yooEnabled}
                    />
                    <button
                      type="button"
                      onClick={() => setShowYooSecret(!showYooSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showYooSecret ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* CryptoBot */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">CryptoBot</h3>
                <Toggle checked={cryptoEnabled} onChange={setCryptoEnabled} />
              </div>

              <div className="space-y-2 pl-1">
                <label className="text-sm font-medium">Token</label>
                <div className="relative">
                  <Input
                    type={showCryptoToken ? "text" : "password"}
                    value={cryptoBotToken}
                    onChange={(e) => setCryptoBotToken(e.target.value)}
                    placeholder="CryptoBot API Token"
                    className="pr-10"
                    disabled={!cryptoEnabled}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCryptoToken(!showCryptoToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCryptoToken ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => handleSave("payment")}
                disabled={saving.payment}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saving.payment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Security */}
      {/* ----------------------------------------------------------------- */}
      {activeSection === "security" && (
        <div className="space-y-6">
          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your admin account password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave("password")}
                  disabled={saving.password}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {saving.password ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 2FA */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">
                    Status:{" "}
                    <span
                      className={
                        twoFaEnabled ? "text-green-500" : "text-muted-foreground"
                      }
                    >
                      {twoFaEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {twoFaEnabled
                      ? "Your account is protected with 2FA."
                      : "Enable 2FA for enhanced security."}
                  </p>
                </div>
                <Button
                  variant={twoFaEnabled ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setTwoFaEnabled(!twoFaEnabled)}
                >
                  {twoFaEnabled ? "Disable" : "Enable"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* API Token */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">API Token</CardTitle>
              <CardDescription>
                Use this token for external API integrations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  value={apiToken}
                  readOnly
                  className="font-mono text-xs opacity-70"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyToken}
                  title="Copy token"
                >
                  {tokenCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
                Regenerate Token
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Backup */}
      {/* ----------------------------------------------------------------- */}
      {activeSection === "backup" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              Backup
            </CardTitle>
            <CardDescription>
              Database backup configuration and management.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Last backup */}
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Last Backup</p>
              <p className="text-sm font-medium mt-1">{lastBackup}</p>
            </div>

            {/* Create backup */}
            <Button
              variant="outline"
              onClick={handleCreateBackup}
              disabled={creatingBackup}
            >
              {creatingBackup ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Backup...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  Create Backup Now
                </>
              )}
            </Button>

            {/* Auto-backup */}
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Auto-backup</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically create backups on a schedule.
                  </p>
                </div>
                <Toggle checked={autoBackup} onChange={setAutoBackup} />
              </div>

              {autoBackup && (
                <div className="space-y-2 pl-1">
                  <label className="text-sm font-medium">
                    Backup Interval
                  </label>
                  <select
                    value={backupInterval}
                    onChange={(e) => setBackupInterval(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="hourly">Every Hour</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => handleSave("backup")}
                disabled={saving.backup}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saving.backup ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
