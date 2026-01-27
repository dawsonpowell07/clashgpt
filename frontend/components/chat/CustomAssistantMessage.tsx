import { type AssistantMessageProps } from "@copilotkit/react-ui";
import { useChatContext, Markdown } from "@copilotkit/react-ui";
import { useRenderToolCall } from "@copilotkit/react-core";
import { Bot } from "lucide-react";

import "@copilotkit/react-ui/styles.css";

export const CustomAssistantMessage = (props: AssistantMessageProps) => {
  const { icons } = useChatContext();
  const { message, isLoading } = props;
  const renderToolCall = useRenderToolCall();

  const wrapperStyles = "flex items-start gap-2 mb-4";
  const avatarStyles =
    "bg-card border border-border shadow-sm min-h-10 min-w-10 rounded-full text-foreground flex items-center justify-center font-medium text-sm";
  const messageStyles =
    "bg-card text-foreground py-2 px-4 rounded-xl break-words flex-shrink-0 max-w-[80%] border border-border shadow-sm transition-all duration-300 hover:shadow-md";

  return (
    <div className={wrapperStyles}>
      <div className={avatarStyles}>
        <Bot className="w-5 h-5" />
      </div>
      <div className="flex-1 max-w-[80%] space-y-2">
        {/* Text message */}
        {message?.content && (
          <div className={messageStyles}>
            <Markdown content={message.content} />
            {isLoading && icons.spinnerIcon}
          </div>
        )}

        {/* Tool calls */}
        {message?.toolCalls?.map((toolCall) => {
          const toolMessage = props.messages?.find(
            (m) => m.role === "tool" && m.toolCallId === toolCall.id
          );
          return (
            <div key={toolCall.id}>
              {renderToolCall({ toolCall, toolMessage })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
