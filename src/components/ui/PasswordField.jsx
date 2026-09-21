"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import IconButton from "./IconButton";
import TextField from "./TextField";

export default function PasswordField({
  helperText = "Use 8 or more characters.",
  ...props
}) {
  const [visible, setVisible] = useState(false);

  const visibilityButton = (
    <IconButton
      icon={visible ? EyeOff : Eye}
      label={visible ? "Hide password" : "Show password"}
      disabled={props.disabled}
      onMouseDown={(event) => {
        // Keep focus in the password input while toggling visibility.
        event.preventDefault();
      }}
      onClick={() => setVisible((current) => !current)}
    />
  );

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      helperText={helperText}
      trailingAction={visibilityButton}
      autoComplete={props.autoComplete ?? "current-password"}
    />
  );
}
