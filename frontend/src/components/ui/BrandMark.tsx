import React from 'react';
import { Scissors } from 'lucide-react';

interface BrandMarkProps {
  color?: string | null;
  small?: boolean;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ color, small = false }) => {
  const bgStyle = color
    ? { backgroundColor: color }
    : { backgroundColor: 'var(--primary-color, #15803d)' };
  const size = small ? 'size-9 rounded-xl' : 'size-12 rounded-2xl';
  const icon = small ? 'size-4' : 'size-5';
  return (
    <div className={`flex shrink-0 items-center justify-center text-white ${size}`} style={bgStyle}>
      <Scissors className={icon} strokeWidth={2.2} />
    </div>
  );
};
