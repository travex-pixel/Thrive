import type { Metadata } from "next";
import { BuilderApp } from "@/components/builder/BuilderApp";

export const metadata: Metadata = {
  title: "Build your evidence pack",
  description: "Add, sort and build your partner visa evidence into numbered PDFs under 5 MB, sized for ImmiAccount. Everything happens on your device.",
};

export default function BuildPage() {
  return <BuilderApp />;
}
