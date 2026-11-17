import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const messages: Record<string, string> = {
  config: "Sign-in is not configured yet. Check Google OAuth env vars.",
  oauth: "Google sign-in did not complete. Try again.",
  unverified: "Use a Google account with a verified email address.",
};

export function SignInError({ code }: { code: string | null }) {
  if (!code) return null;
  const message = messages[code] ?? "Sign-in failed. Try again.";
  return (
    <Alert variant="destructive">
      <AlertTitle>Could not sign in</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}