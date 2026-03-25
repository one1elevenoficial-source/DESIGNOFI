interface LogoProps {
  size?: number;
  showText?: boolean;
}

export function Logo({ size = 40, showText = true }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={size * 0.65}
        height={size}
        viewBox="0 0 26 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="0" y="0" width="6" height="40" rx="3"
          fill="#00e85e"
          style={{ filter: 'drop-shadow(0 0 6px #00e85e88)' }}
        />
        <rect
          x="10" y="0" width="6" height="40" rx="3"
          fill="#00e85e"
          style={{ filter: 'drop-shadow(0 0 6px #00e85e88)' }}
        />
        <rect
          x="20" y="0" width="6" height="40" rx="3"
          fill="#00e85e"
          style={{
            filter: 'drop-shadow(0 0 6px #00e85e88)',
            animation: 'logo-pulse 2s ease-in-out infinite',
          }}
        />
      </svg>
      {showText && (
        <span
          style={{
            fontFamily: "'Bebas Neue', system-ui, sans-serif",
            fontSize: size * 0.45,
            letterSpacing: '4px',
            color: '#ffffff',
            lineHeight: 1,
          }}
        >
          ONE ELEVEN
        </span>
      )}
    </div>
  );
}
