import { z } from "zod";

const emailSchema = z.email();

export function validateAuthInput({ mode, email = "", password = "", confirmation = "" }) {
  const errors = {};
  if (mode !== "reset" && !emailSchema.safeParse(email.trim()).success) errors.email = "Enter a valid email address.";
  if (mode !== "forgot") {
    if (!password) errors.password = "Enter your password.";
    else if (mode !== "login" && password.length < 8) errors.password = "Use 8 or more characters.";
  }
  if (mode === "reset" && password !== confirmation) errors.confirmation = "Your passwords do not match.";
  return errors;
}
