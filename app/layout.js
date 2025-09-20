import Providers from "./store/Providers";
import { connectDB } from "@/lib/db";

export const metadata = {
  title: "Ma Landing",
  description: "Demo Next.js App Router",
};


export default async function RootLayout({ children }) {
  await connectDB();

  return (
    <html lang="fr">
      <body>
      <Providers>{children}</Providers>
      </body>
    </html>
  );
}
