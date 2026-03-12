type LoginScreenProps = {
  onLogin: () => void | Promise<void>;
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <div style={{ padding: 24, color: "white", fontFamily: "system-ui" }}>
      <h2 style={{ marginTop: 0 }}>Login</h2>

      <button onClick={onLogin}>Sign in via email link</button>

      <div style={{ opacity: 0.7, marginTop: 10, fontSize: 13 }}>
        (Luego lo hacemos bonito: modal / artwork UI / etc.)
      </div>
    </div>
  );
}