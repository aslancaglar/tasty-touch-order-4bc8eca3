
import * as React from "react";
import { useIsMobile } from "./use-mobile";

type ResponsiveSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

const sizeMultipliers = {
  mobile: 0.85,  // 85% of original size on mobile
  tablet: 0.92,  // 92% of original size on tablet
  desktop: 1,    // 100% original size on desktop
};

export function useResponsiveText(defaultSize: ResponsiveSize = 'base'): {
  fontSize: string;
  getResponsiveSize: (size: ResponsiveSize) => string;
} {
  const isMobile = useIsMobile();
  const [deviceType, setDeviceType] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  React.useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      if (width < 640) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    };

    const handleResize = () => {
      setDeviceType(checkDeviceType());
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Map base sizes to actual pixel values
  const baseSizeMap: Record<ResponsiveSize, number> = {
    'xs': 0.75,
    'sm': 0.875,
    'base': 1,
    'lg': 1.125,
    'xl': 1.25,
    '2xl': 1.5,
    '3xl': 1.875,
    '4xl': 2.25,
  };

  const getResponsiveSize = (size: ResponsiveSize): string => {
    const baseSize = baseSizeMap[size];
    const multiplier = sizeMultipliers[deviceType];
    const fontSize = baseSize * multiplier;
    return `${fontSize}rem`;
  };

  // Calculate the responsive font size for the default size
  const fontSize = getResponsiveSize(defaultSize);

  return {
    fontSize,
    getResponsiveSize
  };
}
