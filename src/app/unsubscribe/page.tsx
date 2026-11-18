import { Suspense } from "react";
import type { Metadata } from "next";

import { readUnsubscribeToken } from "@/lib/mail/unsubscribe-token";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; done?: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-16">
      <Suspense fallback={null}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const { t, done } = await searchParams;
  if (done) {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">You&apos;re unsubscribed</h1>
        <p className="text-muted-foreground">You won&apos;t receive further emails from this sender.</p>
      </>
    );
  }
  const parsed = readUnsubscribeToken(t);
  if (!parsed) {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">Link not valid</h1>
        <p className="text-muted-foreground">This unsubscribe link is incomplete or has been altered.</p>
      </>
    );
  }
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Unsubscribe?</h1>
      <p className="text-muted-foreground">
        Stop receiving emails at <strong className="text-foreground">{parsed.email}</strong>.
      </p>
      <form action="/api/v1/unsubscribe" method="post">
        <input type="hidden" name="t" value={t} />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          Confirm unsubscribe
        </button>
      </form>
    </>
  );
}
