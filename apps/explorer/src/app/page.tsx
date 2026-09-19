import type { Metadata } from "next";
import { Landing } from "@/components/Landing";

const title = "Compound · Memory OS for a one-person Grok Bot company";
const description =
  "Install shared vs private memory, a Who-I-Am profile, named skills, a decisions log, and a weekly prune. Pick role bots from the public archive.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
  twitter: { card: "summary", title, description },
};

export default function Home() {
  return <Landing />;
}
