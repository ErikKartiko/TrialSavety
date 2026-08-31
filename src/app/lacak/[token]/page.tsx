import TrackClient from "./TrackClient";

export const dynamic = "force-dynamic";

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TrackClient token={token} />;
}
