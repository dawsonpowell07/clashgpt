"use client";

import { createContext, useContext } from "react";

interface InputContextValue {
  pendingInput: string | null;
  clearPendingInput: () => void;
  guestLimitReached: boolean;
  onMessageSent: () => void;
}

export const InputContext = createContext<InputContextValue>({
  pendingInput: null,
  clearPendingInput: () => {},
  guestLimitReached: false,
  onMessageSent: () => {},
});

export function useInputContext() {
  return useContext(InputContext);
}
