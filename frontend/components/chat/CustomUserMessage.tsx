import { type UserMessageProps } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

export const CustomUserMessage = (props: UserMessageProps) => {
  const wrapperStyles = "flex items-center gap-2 justify-end mb-4";
  const messageStyles =
    "bg-primary text-primary-foreground py-2 px-4 rounded-xl break-words flex-shrink-0 max-w-[80%] shadow-sm transition-all duration-300 hover:shadow-lg";
  const avatarStyles =
    "bg-primary text-primary-foreground shadow-sm min-h-10 min-w-10 rounded-full flex items-center justify-center font-medium text-sm";
  return (
    <div className={wrapperStyles}>
      <div className={messageStyles}>{props.message?.content}</div>
      <div className={avatarStyles}>TS</div>
    </div>
  );
};
