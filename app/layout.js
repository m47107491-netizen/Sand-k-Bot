import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const ui = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-ui",
});

export const metadata = {
  title: "20/16 Sandık — Canlı",
  description: "Sadece 20 coin / 16 kişi sandıkları",
};

export const viewport = {
  themeColor: "#130f18",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={ui.variable}>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
