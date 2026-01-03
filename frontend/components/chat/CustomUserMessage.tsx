import { type UserMessageProps } from "@copilotkit/react-ui";

export function CustomUserMessage(props: UserMessageProps) {
  return (
    <div className="flex items-start gap-3 justify-end mb-6">
      <div className="bg-black dark:bg-neutral-100 text-white dark:text-black py-3 px-4 max-w-[80%] font-[family-name:var(--font-body)] transition-all duration-300 hover:shadow-lg">
        {props.message?.content}
      </div>
    </div>
  );
}
