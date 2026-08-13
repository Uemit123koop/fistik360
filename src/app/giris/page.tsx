import { redirect } from "next/navigation";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const query = error ? `&error=${encodeURIComponent(error)}` : "";
  redirect(`/?auth=login${query}`);
}
