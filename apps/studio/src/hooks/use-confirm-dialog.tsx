import React, { createContext, useContext, useState, ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"

interface ConfirmOptions {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmDialogContext = createContext<
  ConfirmDialogContextType | undefined
>(undefined)

export function useConfirmDialog() {
  const ctx = useContext(ConfirmDialogContext)
  if (!ctx)
    throw new Error(
      "useConfirmDialog must be used within ConfirmDialogProvider"
    )
  return ctx.confirm
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({})
  const [resolvePromise, setResolvePromise] = useState<
    ((v: boolean) => void) | null
  >(null)

  const confirm = (opts: ConfirmOptions) => {
    setOptions(opts)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve)
    })
  }

  const handleClose = (result: boolean) => {
    setOpen(false)
    if (resolvePromise) {
      resolvePromise(result)
      setResolvePromise(null)
    }
  }

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {options.title || "Are you sure?"}
            </AlertDialogTitle>
            {options.description && (
              <AlertDialogDescription>
                {options.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleClose(false)}>
              {options.cancelText || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleClose(true)}>
              {options.confirmText || "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmDialogContext.Provider>
  )
}
