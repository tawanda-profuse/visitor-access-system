"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

// A plain password <input> with a show/hide toggle (eye icon), styled to match the
// existing `ug-input` convention. Drop-in replacement for `<input type="password" ...>`.
export function PasswordInput({ className, style, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={className ?? "ug-input"}
        style={{ paddingRight: "2.4rem", width: "100%", ...style }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
        style={{
          position: "absolute",
          right: "0.65rem",
          display: "flex",
          alignItems: "center",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "var(--ug-text-secondary)",
        }}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
