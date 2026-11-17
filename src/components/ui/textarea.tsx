import * as React from "react"

import { controlClass } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(controlClass, "min-h-28 resize-y py-2.5 leading-relaxed", className)}
      {...props}
    />
  )
}

export { Textarea }
