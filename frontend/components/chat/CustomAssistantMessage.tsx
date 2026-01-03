import { type AssistantMessageProps, useChatContext, Markdown } from "@copilotkit/react-ui";

export function CustomAssistantMessage(props: AssistantMessageProps) {
  const { icons } = useChatContext();
  const { message, isLoading, subComponent } = props;

  return (
    <div className="mb-6">
      <div className="flex items-start gap-3">
        <div className="bg-neutral-50 dark:bg-neutral-800 text-black dark:text-white py-3 px-4 max-w-[80%] border border-neutral-200 dark:border-neutral-700 font-[family-name:var(--font-body)] transition-all duration-300 hover:shadow-md">
          {message && <Markdown content={message.content || ""} />}
          {isLoading && icons.spinnerIcon}
        </div>
      </div>
      {subComponent && <div className="mt-3 ml-0">{subComponent}</div>}
    </div>
  );
}
