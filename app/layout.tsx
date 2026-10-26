import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intra-Country Disparity Divergence Tool",
  description: "Explore sub-national development gaps over time.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
