"use client";

import { SignInButton } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface AuthGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The page/feature name shown in the description, e.g. "Player Profiles" */
  featureName: string;
  /** Where Clerk redirects after sign-in */
  redirectUrl: string;
}

export function AuthGateDialog({
  open,
  onOpenChange,
  featureName,
  redirectUrl,
}: AuthGateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in required</DialogTitle>
          <DialogDescription>
            You need an account to access {featureName}. Sign in or create an
            account to get started.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
            <button
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign In
            </button>
          </SignInButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
