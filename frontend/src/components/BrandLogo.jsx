import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

const BrandLogo = ({ size = 48, iconSize = 32 }) => {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed) return <Sparkles size={iconSize} color="var(--color-primary)" />;

  return (
    <img
      src="/logo.png"
      alt="Merkür Yörünge logosu"
      width={size}
      height={size}
      onError={() => setImageFailed(true)}
      style={{ display: 'block', maxWidth: '100%', objectFit: 'contain' }}
    />
  );
};

export default BrandLogo;
