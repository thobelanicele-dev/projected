import Link from "next/link";

export default async function ChangeEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const success = params.success === "true";
  const error = typeof params.error === "string" ? params.error : null;

  if (success) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center">
        <h1 className="text-lg font-medium text-emerald-400">Email updated</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Your FxInsites login email has been changed. Use your new address next time you log in.
        </p>
        <Link
          href="/account"
          className="mt-4 inline-block rounded-full bg-zinc-50 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-300"
        >
          Back to account settings
        </Link>
      </div>
    );
  }

  const heading =
    error === "missing-token"
      ? "Confirmation link is missing a token"
      : error === "email-taken"
        ? "That email is now in use"
        : error === "server-error"
          ? "Something went wrong on our end"
          : "Confirmation link is invalid or expired";

  const body =
    error === "missing-token"
      ? "Use the full link from your confirmation email."
      : error === "email-taken"
        ? "Someone registered that email address before you confirmed the change. Try a different address from your account settings."
        : error === "server-error"
          ? "This wasn't a problem with your link — please try clicking it again in a moment."
          : "This link has expired or was already used.";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center">
      <h1 className="text-lg font-medium text-red-400">{heading}</h1>
      <p className="mt-2 text-sm text-zinc-400">{body}</p>
      <Link href="/login" className="mt-4 inline-block text-sky-400 hover:text-sky-300">
        Back to login
      </Link>
    </div>
  );
}
