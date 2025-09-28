
import ClientProviders from "./ClientProviders";

export const metadata = {
  title: "Ma Landing",
  description: "Demo Next.js App Router",
};


export default async function RootLayout({ children }) {


  return (
    <html lang="fr">
      <body>
      <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
