"use client";
import { DraftsProvider } from "./hooks/draftsContext";
export default function ClientProviders({ children }) {
  return <DraftsProvider>{children}</DraftsProvider>;
}