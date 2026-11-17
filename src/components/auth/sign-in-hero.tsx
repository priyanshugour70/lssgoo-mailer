import { MailerMark } from "@/components/brand/mailer-mark";

export function SignInHero() {
  return (
    <section className="flex flex-col gap-4">
      <MailerMark size="lg" />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Lssgoo Mailer</h1>
        <p className="text-base text-muted-foreground">
          Send personal, individually-addressed email campaigns from your own mailbox.
        </p>
      </div>
    </section>
  );
}
