import type { Metadata } from "next";
import { SetupWizard } from "@/components/SetupWizard";

export const metadata: Metadata = {
  title: "Setup · Compound",
  description: "Twelve copy-paste prompts that install Compound’s memory OS on the bots you already run.",
};

export default function SetupPage() {
  return <SetupWizard />;
}
