type CoinEntry = {
  id: string;
  label: string;
  front: string;
  back: string;
  unlocked: boolean;
};

type CoinBankProps = {
  coins: CoinEntry[];
  onOpenCoin: (coin: CoinEntry) => void;
};

export function CoinBank({ coins, onOpenCoin }: CoinBankProps) {
  return (
    <div
      style={{
        width: "min(760px, 92vw)",
        margin: "18px auto 10px",
        padding: "14px 16px",
        borderRadius: 16,
        background: "rgba(0,0,0,0.12)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        Coin Bank
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))",
          gap: 12,
        }}
      >
        {coins.map((coin) => (
          <button
            key={coin.id}
            type="button"
            onClick={() => coin.unlocked && onOpenCoin(coin)}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: coin.unlocked
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.18)",
              borderRadius: 14,
              padding: 10,
              cursor: coin.unlocked ? "pointer" : "default",
              opacity: coin.unlocked ? 1 : 0.45,
            }}
          >
            <img
              src={coin.front}
              alt={coin.label}
              style={{
                width: 64,
                height: 64,
                objectFit: "contain",
                aspectRatio: "1 / 1",
                display: "block",
                margin: "0 auto 8px",
                filter: coin.unlocked
                  ? "drop-shadow(0 4px 8px rgba(0,0,0,0.28))"
                  : "grayscale(1)",
              }}
            />
            <div
              style={{
                fontSize: 11,
                lineHeight: 1.2,
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              {coin.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}