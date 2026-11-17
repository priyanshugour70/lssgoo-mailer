import { GoogleIcon } from "@/components/brand/google-icon";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GoogleSignIn() {
  return (
    <a href="/api/v1/auth/google" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
      <GoogleIcon className="size-5" />
      Continue with Google
    </a>
  );
}
