type TopBarProps = {
  onLogout: () => void;
};

export function TopBar({ onLogout }: TopBarProps) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", padding: 12 }}>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}