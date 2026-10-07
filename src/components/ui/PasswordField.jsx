"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import IconButton from "./IconButton";
import TextField from "./TextField";

function DesignEye(props) { return <Image {...props} src="/auth/final-eye.svg" alt="" width={20} height={20} style={{ width:20, height:20 }} unoptimized />; }
function DesignEyeOff(props) { return <Image {...props} src="/auth/final-eye-off.svg" alt="" width={20} height={20} style={{ width:20, height:20 }} unoptimized />; }

export default function PasswordField({
  helperText = "Use 8 or more characters.",
  designIcons = false,
  ...props
}) {
  const [visible, setVisible] = useState(false);

  const visibilityButton = (
    <IconButton
      icon={designIcons ? (visible ? DesignEyeOff : DesignEye) : (visible ? EyeOff : Eye)}
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
