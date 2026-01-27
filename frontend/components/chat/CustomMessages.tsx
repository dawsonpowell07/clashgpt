import { type MessagesProps } from "@copilotkit/react-ui";
import { useEffect, useRef } from "react";

export function CustomMessages({
  messages,
  inProgress,
  RenderMessage,
}: MessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {messages.map((message, index) => {
          const isCurrentMessage = index === messages.length - 1;
          return (
            <RenderMessage
              key={index}
              message={message}
              inProgress={inProgress}
              index={index}
              isCurrentMessage={isCurrentMessage}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
