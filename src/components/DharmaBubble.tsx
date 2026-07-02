import { forwardRef } from "react";
import "./DharmaBubble.css";

type DharmaBubbleProps = {
  message?: string;
};

const DharmaBubble = forwardRef<HTMLDivElement, DharmaBubbleProps>(
  ({ message }, ref) => {
    if (!message) return null;
    return (
      <div ref={ref} className="dharma-bubble">
        <div className="dharma-bubble-text">{message}</div>
      </div>
    );
  }
);

export default DharmaBubble;