"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  InfoIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* ───────────── Toasts ───────────── */

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; tone: ToastTone; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);
const ConfirmContext = createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null);

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
};

const toneStyles: Record<ToastTone, string> = {
  success: "text-success",
  error: "text-destructive",
  info: "text-info",
};
const toneIcons = {
  success: CheckCircle2Icon,
  error: AlertCircleIcon,
  info: InfoIcon,
} as const;

export function AppProviders({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = (nextId.current += 1);
      setToasts((current) => [...current.slice(-3), { id, tone, message }]);
      // Errors stay longer so they can be read.
      window.setTimeout(() => dismiss(id), tone === "error" ? 8000 : 4500);
    },
    [dismiss],
  );

  const toast = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
    }),
    [push],
  );

  const [pending, setPending] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null);
  const [open, setOpen] = useState(false);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
        setOpen(true);
      }),
    [],
  );

  function settle(value: boolean) {
    pending?.resolve(value);
    setOpen(false);
  }

  return (
    <ToastContext value={toast}>
      <ConfirmContext value={confirm}>
        {children}

        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--spacing-dock)+env(safe-area-inset-bottom)+0.75rem)] z-toast flex flex-col items-center gap-2 px-4 md:inset-x-auto md:right-6 md:bottom-6 md:items-end md:px-0"
        >
          {toasts.map((item) => {
            const Icon = toneIcons[item.tone];
            return (
              <div
                key={item.id}
                role={item.tone === "error" ? "alert" : "status"}
                className="pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-2.5 rounded-xl bg-popover p-3 pr-2 text-sm text-popover-foreground shadow-popover"
              >
                <Icon
                  aria-hidden
                  className={cn("mt-0.5 size-4 shrink-0", toneStyles[item.tone])}
                />
                <p className="min-w-0 flex-1 break-words">{item.message}</p>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(item.id)}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (!next) settle(false);
          }}
        >
          <DialogContent showClose={false}>
            <DialogHeader>
              <DialogTitle>{pending?.title}</DialogTitle>
              {pending?.description ? (
                <DialogDescription>{pending.description}</DialogDescription>
              ) : null}
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => settle(false)}>
                Cancel
              </Button>
              <Button
                variant={pending?.destructive ? "destructive" : "default"}
                onClick={() => settle(true)}
              >
                {pending?.confirmLabel ?? "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ConfirmContext>
    </ToastContext>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within AppProviders");
  return context;
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used within AppProviders");
  return context;
}
