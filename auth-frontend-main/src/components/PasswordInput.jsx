import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ value, onChange, placeholder = "Password", autoComplete, disabled, required = true, minLength, id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-group">
      <input
        id={id}
        className="input"
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        required={required}
        minLength={minLength}
      />
      <button type="button" className="icon-btn sm input-addon" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

// Live checklist that mirrors the server's password policy.
export function PasswordRules({ password }) {
  const rules = [
    ["At least 8 characters", password.length >= 8],
    ["Contains a letter", /[A-Za-z]/.test(password)],
    ["Contains a number", /[0-9]/.test(password)],
  ];
  return (
    <ul className="rules">
      {rules.map(([label, ok]) => (
        <li key={label} className={ok ? "ok" : ""}>
          {ok ? "✓" : "○"} {label}
        </li>
      ))}
    </ul>
  );
}
