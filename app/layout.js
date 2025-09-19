import Providers from "./store/Providers";

export const metadata = {
  title: "Ma Landing",
  description: "Demo Next.js App Router",
};


export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
      <Providers>{children}</Providers>
      </body>
    </html>
  );
}
