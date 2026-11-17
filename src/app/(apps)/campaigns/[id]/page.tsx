import { CampaignDetail } from "@/components/mailer/campaign-detail";

export const instant = false;

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CampaignDetail id={id} />;
}
