import React, { ReactNode, useEffect, useState } from 'react';

interface iPhoneFrameProps {
  children: ReactNode;
  statusBarContent?: ReactNode;
  bottomNavContent?: ReactNode;
  backgroundClassName?: string;
}

export default function IPhoneFrame({ 
  children, 
  statusBarContent, 
  bottomNavContent,
  backgroundClassName = "bg-black" 
}: iPhoneFrameProps) {
  // Always start with false to match server render, then update on client
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted to prevent hydration mismatch
    setMounted(true);
    
    const checkMobile = () => {
      if (typeof window === 'undefined') return;
      
      const width = window.innerWidth;
      const isMobileWidth = width < 768;
      
      const isTouchDevice = 'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0 ||
                           (navigator as any).msMaxTouchPoints > 0;
      
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      
      const shouldBeMobile = isMobileWidth || (isTouchDevice && isMobileUA) || (isTouchDevice && width < 1024);
      
      setIsMobile(shouldBeMobile);
    };

    // Check immediately after mount
    checkMobile();
    
    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  // On mobile, render without frame - full screen
  if (isMobile) {
    return (
      <div className={`min-h-screen w-full ${backgroundClassName} overflow-hidden`} style={{ margin: 0, padding: 0 }}>
        {/* Status Bar for mobile */}
        {statusBarContent && (
          <div className="w-full h-[44px] bg-transparent flex items-center justify-between px-4 z-10">
            {statusBarContent}
          </div>
        )}
        
        {/* Main Content - Full screen, no frame */}
        <div className={`relative w-full ${statusBarContent ? 'min-h-[calc(100vh-44px)]' : 'min-h-screen'} ${backgroundClassName} overflow-auto`} style={{ margin: 0, padding: 0 }}>
          {children}
        </div>

        {/* Bottom Navigation */}
        {bottomNavContent && (
          <div className="fixed bottom-0 left-0 right-0 bg-white pt-2 pb-6 rounded-t-3xl shadow-lg z-10">
            {bottomNavContent}
          </div>
        )}
      </div>
    );
  }

  // On desktop, render with iPhone frame
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="relative mx-auto bg-black rounded-[60px] h-[860px] w-[420px] shadow-2xl overflow-hidden border-[14px] border-black">
        {/* Notch */}
        <div className="absolute top-[12px] left-1/2 transform -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-[20px] z-50 flex items-center justify-center">
          <div className="absolute right-[24px] w-[8px] h-[8px] rounded-full bg-[#1a1a1a]"></div>
        </div>

        {/* Status Bar */}
        <div className="absolute top-[8px] left-0 right-0 h-[44px] bg-transparent flex items-center justify-between px-3 z-[45]">
          {statusBarContent}
        </div>

        {/* Side buttons */}
        <div className="absolute top-[120px] left-[-14px] h-[80px] w-[4px] bg-gray-700 rounded-l-lg"></div>
        <div className="absolute top-[220px] left-[-14px] h-[80px] w-[4px] bg-gray-700 rounded-l-lg"></div>
        <div className="absolute top-[180px] right-[-14px] h-[100px] w-[4px] bg-gray-700 rounded-r-lg"></div>

        {/* Main Content */}
        <div className={`relative w-full h-full ${backgroundClassName} overflow-hidden`}>
          {children}
        </div>

        {/* Bottom Navigation */}
        {bottomNavContent && (
          <div className="absolute bottom-0 left-0 right-0 bg-white pt-2 pb-6 rounded-t-3xl shadow-lg">
            {bottomNavContent}
          </div>
        )}

        {/* Home Indicator */}
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-[120px] h-[5px] bg-white rounded-full"></div>
      </div>
    </div>
  );
}
