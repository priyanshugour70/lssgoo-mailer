import { Suspense } from "react";
import { redirect } from "next/navigation";

import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { readPrincipal } from "@/lib/auth/dal";
import { SignInHero } from "@/components/auth/sign-in-hero";
import { SignInError } from "@/components/auth/sign-in-errors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <SignInAuthedRedirect />
      </Suspense>
      <Suspense fallback={<SignInFallback />}>
        <SignInContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SignInAuthedRedirect(): Promise<null> {
  const user = await readPrincipal();
  if (user) redirect("/");
  return null;
}

function SignInFallback() {
  return (
    <main
      className="sign-in-bg flex min-h-svh flex-col justify-center px-4 py-10"
      style={{
        paddingTop: "max(2.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <SignInHero />
        <Card className="border-none bg-card/85 shadow-lg backdrop-blur-md">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Loading…</CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleSignIn />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

async function SignInContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main
      className="sign-in-bg flex min-h-svh flex-col justify-center px-4 py-10"
      style={{
        paddingTop: "max(2.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <SignInHero />
        <Card className="animate-in fade-in zoom-in-95 border-none bg-card/85 shadow-lg backdrop-blur-md duration-500 fill-mode-both">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Google OAuth only. Any verified Google account can join.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SignInError code={params.error ?? null} />
            <GoogleSignIn />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}