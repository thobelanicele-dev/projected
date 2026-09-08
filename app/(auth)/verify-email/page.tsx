import Link from "next/link";

export default async function VerifyEmailPage({
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
        <h1 className="text-lg font-medium text-emerald-400">Email verified</h1>
        <p className="mt-2 text-sm text-zinc-400">You&apos;re all set and signed in.</p>
        <Link
          href="/planner"
          className="mt-4 inline-block rounded-full bg-zinc-50 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-300"
        >
          Go to the planner
        </Link>
      </div>
    );
  }

  const heading =
    error === "missing-token"
      ? "Verification link is missing a token"
      : error === "server-error"
        ? "Something went wrong on our end"
        : "Verification link is invalid or expired";

  const body =
    error === "missing-token"
      ? "Use the full link from your verification email."
      : error === "server-error"
        ? "This wasn't a problem with your link — please try clicking it again in a moment."
        : "This link has expired or was already used.";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center">
      <h1 className="text-lg font-medium text-red-400">{heading}</h1>
      <p className="mt-2 text-sm text-zinc-400">{body}</p>
      <Link href="/signup" className="mt-4 inline-block text-sky-400 hover:text-sky-300">
        Back to signup
      </Link>
    </div>
  );
}
