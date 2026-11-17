import { connection } from "next/server";

import { SaasShell } from "@/components/layout/saas-shell";
import { getCurrentUser } from "@/lib/auth/dal";

export async function AppFrame({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await getCurrentUser();
  return <SaasShell user={user}>{children}</SaasShell>;
}
