
import * as React from "react"

// Setting breakpoint for mobile devices and tablets (up to 768px)
const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Function to determine if device is mobile or tablet
    const checkMobileOrTablet = () => {
      // Check both screen width and user agent for better detection
      const isMobileByWidth = window.innerWidth < MOBILE_BREAKPOINT
      
      // Using userAgent to detect mobile and tablet devices
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobileOrTabletByUA = (
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent)
      )
      
      console.log("Screen width:", window.innerWidth, "Mobile by width:", isMobileByWidth, "Mobile/Tablet by UA:", isMobileOrTabletByUA)
      
      // Consider device as mobile/tablet if either condition is true
      return isMobileByWidth || isMobileOrTabletByUA
    }
    
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      const result = checkMobileOrTablet()
      console.log("Device detection changed, isMobile:", result)
      setIsMobile(result)
    }
    
    mql.addEventListener("change", onChange)
    setIsMobile(checkMobileOrTablet())
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
