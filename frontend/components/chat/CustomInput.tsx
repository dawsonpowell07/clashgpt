"use client";

import { type InputProps } from "@copilotkit/react-ui";
import { useState } from "react";
import { Send } from "lucide-react";

export function CustomInput({ inProgress, onSend, isVisible }: InputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (inputValue: string) => {
    if (inputValue.trim()) {
      onSend(inputValue);
      setValue("");
    }
  };

  const wrapperStyle = "flex gap-3 p-4 border-t border-border bg-card";
  const inputStyle =
    "flex-1 p-3 rounded-lg border border-input bg-input/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 disabled:bg-muted disabled:cursor-not-allowed text-base transition-all duration-300";
  const buttonStyle =
    "px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed font-medium transition-all duration-300 hover:shadow-lg active:scale-95 flex items-center gap-2";

  return (
    <div className={wrapperStyle}>
      <input
        disabled={inProgress}
        type="text"
        placeholder="Ask about decks, players, strategies..."
        className={inputStyle}
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
        className={buttonStyle}
        onClick={() => handleSubmit(value)}
      >
        <Send className="w-4 h-4" />
        Ask
      </button>
    </div>
  );
}
