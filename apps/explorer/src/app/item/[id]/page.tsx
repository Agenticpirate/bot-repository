import type { Metadata } from "next";
import { ItemDetail } from "@/components/ItemDetail";
import { SiteHeader } from "@/components/SiteHeader";

const title = "Archive listing · Compound";
const description =
  "Research mirror of a published bot, skill, or template. Canonical page lives on the source site.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
  twitter: { card: "summary", title, description },
};

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <SiteHeader active="explore" />
      <main id="main">
        <ItemDetail encodedId={id} />
      </main>
    </>
  );
}
