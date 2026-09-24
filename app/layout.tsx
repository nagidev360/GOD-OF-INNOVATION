import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata={title:"GOD OF INNOVATION",description:"A futuristic innovation command center."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}