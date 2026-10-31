export const metadata = {
  title: "20/16 Sandık — Canlı",
  description: "Sadece 20 coin / 16 kişi sandıkları",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
