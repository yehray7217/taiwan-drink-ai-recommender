import "./globals.css";

export const metadata = {
  title: "台灣手搖飲 AI 推薦系統",
  description: "Taiwan Drink AI Recommender"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}