import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { controlClass } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Native select: best mobile behaviour (OS picker) and fully accessible. */
function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          controlClass,
          "h-11 appearance-none pr-9 md:h-9",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}

export { Select }
