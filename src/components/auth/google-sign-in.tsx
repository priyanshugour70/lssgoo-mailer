import { GoogleIcon } from "@/components/brand/google-icon";
import { Button } from "@/components/ui/button";

export function GoogleSignIn() {
  return (
    <Button
      render={<a href="/api/v1/auth/google" />}
      nativeButton={false}
      variant="outline"
      size="lg"
      className="h-12 w-full border-border/80 bg-background text-base shadow-sm transition-transform hover:bg-muted active:scale-[0.98]"
    >
      <GoogleIcon className="size-5" />
      Continue with Google
    </Button>
  );
}