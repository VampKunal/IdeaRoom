export function PasswordStrength({ value }) {
  const strength =
    value.length >= 10 ? "strong" :
    value.length >= 6 ? "medium" :
    value.length > 0 ? "weak" :
    null;

  if (!strength) return null;

  const colors = {
    weak: "bg-red-500",
    medium: "bg-yellow-500",
    strong: "bg-green-500",
  };

  return (
    <div className="mt-1">
      <div className="h-1 w-full rounded bg-white/10 overflow-hidden">
        <div
          className={`h-full ${colors[strength]} transition-all`}
          style={{
            width:
              strength === "weak" ? "33%" :
              strength === "medium" ? "66%" :
              "100%",
          }}
        />
      </div>
      <p className="mt-1 text-xs text-white/50">
        Password strength: {strength}
      </p>
    </div>
  );
}
