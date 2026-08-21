import { redirect } from "next/navigation";

type ComparePageProps = { searchParams: Promise<{ scenario?: string; case?: string }> };

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const selected = params.case ?? params.scenario;
  redirect(`/demo?scene=comparison${selected ? `&case=${selected}` : ""}`);
}
