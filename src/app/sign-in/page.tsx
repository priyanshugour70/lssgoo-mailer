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
      className="flex min-h-svh flex-col justify-center bg-background px-4 py-10"
      style={{
        paddingTop: "max(2.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <SignInHero />
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use your Google account.</CardDescription>
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
      className="flex min-h-svh flex-col justify-center bg-background px-4 py-10"
      style={{
        paddingTop: "max(2.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <SignInHero />
        <Card className="animate-fade-up">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Use your Google account. No password to remember.
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