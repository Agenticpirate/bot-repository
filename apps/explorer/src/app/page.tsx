import type { Metadata } from "next";
import { Landing } from "@/components/Landing";

export const metadata: Metadata = {
  title: "Compound · Memory OS for a one-person Grok Bot company",
  description:
    "Install shared vs private memory, a Who-I-Am profile, named skills, a decisions log, and a weekly prune. Pick role bots from the public archive.",
};

export default function Home() {
  return <Landing />;
}
