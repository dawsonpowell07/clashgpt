"use client";

import { createContext, useContext } from "react";

interface InputContextValue {
  pendingInput: string | null;
  clearPendingInput: () => void;
}

export const InputContext = createContext<InputContextValue>({
  pendingInput: null,
  clearPendingInput: () => {},
});

export function useInputContext() {
  return useContext(InputContext);
}
