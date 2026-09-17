import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/auth/session";
import { ChangePasswordForm } from "@/app/components/account/ChangePasswordForm";
import { ChangeEmailForm } from "@/app/components/account/ChangeEmailForm";
import { DeleteAccountSection } from "@/app/components/account/DeleteAccountSection";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Account settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {session.username} · {session.email}
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-zinc-200">Change password</h2>
        <ChangePasswordForm />
      </section>

      <section className="flex flex-col gap-4 border-t border-zinc-800 pt-8">
        <h2 className="text-sm font-medium text-zinc-200">Change email</h2>
        <ChangeEmailForm currentEmail={session.email} />
      </section>

      <section className="border-t border-zinc-800 pt-8">
        <DeleteAccountSection />
      </section>
    </div>
  );
}
