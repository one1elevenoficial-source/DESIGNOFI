import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 40, className = '' }) => {
  return (
    <img
      src="/logo-one-eleven.svg"
      alt="ONE ELEVEN"
      width={size}
      height={size}
      className={`${className}`}
      style={{
        display: 'block',
      }}
    />
  );
};

export default Logo;
