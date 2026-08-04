import { ResetPasswordForm } from "@/app/(auth)/reset-password/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : null;

  return <ResetPasswordForm token={token} />;
}
