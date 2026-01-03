"use client";

import { type InputProps } from "@copilotkit/react-ui";
import { useState } from "react";

export function CustomInput({ inProgress, onSend }: InputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (inputValue: string) => {
    if (inputValue.trim()) {
      onSend(inputValue);
      setValue("");
    }
  };

  return (
    <div className="flex gap-3 p-6 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      <input
        disabled={inProgress}
        type="text"
        placeholder="Ask about decks, players, strategies..."
        className="flex-1 p-3 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-black dark:focus:border-white disabled:bg-neutral-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed font-[family-name:var(--font-body)] text-base transition-all duration-300 bg-white dark:bg-neutral-900 text-black dark:text-white"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(value);
          }
        }}
      />
      <button
        disabled={inProgress || !value.trim()}
        className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:bg-neutral-400 disabled:cursor-not-allowed font-[family-name:var(--font-body)] font-medium transition-all duration-300 hover:shadow-lg active:scale-95"
        onClick={() => handleSubmit(value)}
      >
        Send
      </button>
    </div>
  );
}
