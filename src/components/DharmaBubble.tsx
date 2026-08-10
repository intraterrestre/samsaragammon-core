import { forwardRef } from "react";
import "./DharmaBubble.css";
import buddhaImg from "../assets/tokens/buda-karma-er.webp";

type DharmaBubbleProps = {
  message?: string;
};

const DharmaBubble = forwardRef<HTMLDivElement, DharmaBubbleProps>(
  ({ message }, ref) => {
    if (!message) return null;
    return (
      <div ref={ref} className="dharma-bubble">
        <img src={buddhaImg} alt="" className="dharma-bubble-icon" />
        <div className="dharma-bubble-text">{message}</div>
      </div>
    );
  }
);

export default DharmaBubble;