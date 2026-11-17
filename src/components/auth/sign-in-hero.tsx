import { Clock3Icon, ShieldCheckIcon, SmartphoneIcon } from "lucide-react";

import { MailerMark } from "@/components/brand/mailer-mark";
import { IconWell } from "@/components/ui/icon-well";

const features = [
  {
    title: "Phone first",
    body: "Thumb-friendly controls and safe-area layouts.",
    icon: SmartphoneIcon,
    tone: "sky" as const,
  },
  {
    title: "Live time",
    body: "Clocks and session views follow your timezone.",
    icon: Clock3Icon,
    tone: "amber" as const,
  },
  {
    title: "Secure sign-in",
    body: "Google OAuth for verified accounts only.",
    icon: ShieldCheckIcon,
    tone: "emerald" as const,
  },
];

export function SignInHero() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <MailerMark size="lg" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold tracking-wide text-violet-600 uppercase dark:text-violet-400">
            SaaS
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Lssgoo Mailer
          </h1>
          <p className="text-sm text-muted-foreground">
            Mobile-ready mail workspace. Works on phone and laptop.
          </p>
        </div>
      </div>
      <div className="grid gap-3">
        {features.map((feature, index) => (
          <ProfileFeature key={feature.title} feature={feature} index={index} />
        ))}
      </div>
    </section>
  );
}

function ProfileFeature({
  feature,
  index,
}: {
  feature: (typeof features)[number];
  index: number;
}) {
  const Icon = feature.icon;
  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-2 flex items-start gap-3 rounded-2xl border bg-card/70 p-3 shadow-sm backdrop-blur-sm duration-500 fill-mode-both"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <IconWell icon={Icon} tone={feature.tone} />
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold">{feature.title}</p>
        <p className="text-sm text-muted-foreground">{feature.body}</p>
      </div>
    </div>
  );
}