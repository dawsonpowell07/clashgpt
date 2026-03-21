"use client";

import { type InputProps } from "@copilotkit/react-ui";
import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { useInputContext } from "./input-context";

const MAX_INPUT_LENGTH = 1500;

export function CustomInput({ inProgress, onSend, isVisible }: InputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { pendingInput, clearPendingInput } = useInputContext();

  // When the sidebar populates pending input, set the value and focus
  useEffect(() => {
    if (pendingInput !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(pendingInput);
      clearPendingInput();
      // Focus the input after a short delay to ensure it's rendered
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [pendingInput, clearPendingInput]);

  const isOverLimit = value.length > MAX_INPUT_LENGTH;

  const handleSubmit = (inputValue: string) => {
    if (inputValue.trim() && !isOverLimit) {
      onSend(inputValue);
      setValue("");
    }
  };

  return (
    <div
      className="flex gap-3 px-4 py-3 border-t bg-card/80 backdrop-blur-sm"
      style={{ borderColor: "oklch(0.35 0.025 250)" }}
    >
      <div className="relative flex-1">
        <input
          ref={inputRef}
          disabled={inProgress}
          type="text"
          placeholder="Ask about decks, players, strategies..."
          className="w-full px-4 py-2.5 rounded-xl border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:cursor-not-allowed transition-all duration-200"
          style={{
            background: "oklch(0.26 0.02 250)",
            borderColor: isOverLimit
              ? "oklch(0.65 0.2 25)"
              : inProgress
              ? "oklch(0.33 0.02 250)"
              : "oklch(0.36 0.025 250)",
            boxShadow: "none",
          }}
          onFocus={(e) => {
            if (!isOverLimit) {
              e.currentTarget.style.borderColor = "oklch(0.68 0.16 45 / 0.6)";
              e.currentTarget.style.boxShadow = "0 0 0 3px oklch(0.68 0.16 45 / 0.12), 0 1px 8px oklch(0.68 0.16 45 / 0.08)";
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = isOverLimit
              ? "oklch(0.65 0.2 25)"
              : "oklch(0.36 0.025 250)";
            e.currentTarget.style.boxShadow = "none";
          }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(value);
            }
          }}
        />
        {isOverLimit && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none"
            style={{ color: "oklch(0.65 0.2 25)" }}
          >
            {value.length}/{MAX_INPUT_LENGTH}
          </span>
        )}
      </div>
      <button
        disabled={inProgress || !value.trim() || isOverLimit}
        className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: inProgress || !value.trim() || isOverLimit
            ? "oklch(0.30 0.02 250)"
            : "linear-gradient(135deg, oklch(0.72 0.16 45) 0%, oklch(0.64 0.18 38) 100%)",
          color: inProgress || !value.trim() || isOverLimit
            ? "oklch(0.55 0.01 80)"
            : "oklch(0.14 0.018 250)",
          boxShadow: !inProgress && value.trim() && !isOverLimit
            ? "0 2px 12px oklch(0.68 0.16 45 / 0.3)"
            : "none",
          fontFamily: "var(--font-heading)",
          fontSize: "0.65rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
        onClick={() => handleSubmit(value)}
      >
        <Send className="w-3.5 h-3.5" />
        Send
      </button>
    </div>
  );
}
