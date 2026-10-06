import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/app/components/LegalPageLayout";

export const metadata: Metadata = {
  title: "Contact | FxInsites",
  description: "How to reach FxInsites for support, privacy requests, security reports, or anything else.",
};

const ADDRESSES = [
  {
    address: "support@fxinsites.com",
    label: "Support",
    body: "Questions about using FxInsites, bug reports, or anything not working as expected.",
  },
  {
    address: "hello@fxinsites.com",
    label: "General",
    body: "Partnerships, press, feedback, or anything that doesn't fit the other addresses.",
  },
  {
    address: "privacy@fxinsites.com",
    label: "Privacy",
    body: "Questions about your data, or requests covered by our Privacy Policy.",
  },
  {
    address: "security@fxinsites.com",
    label: "Security",
    body: "Found a vulnerability? Report it here so we can fix it before it's exploited.",
  },
];

export default function ContactPage() {
  return (
    <LegalPageLayout title="Contact" updated="October 6, 2026">
      <LegalSection title="Get in touch">
        <p>Pick whichever fits best. We read all of them.</p>
      </LegalSection>

      <LegalSection title="Addresses">
        <div className="flex flex-col gap-5">
          {ADDRESSES.map((item) => (
            <div key={item.address}>
              <a
                href={`mailto:${item.address}`}
                className="text-sm font-medium text-sky-400 hover:text-sky-300"
              >
                {item.address}
              </a>
              <p className="mt-1 text-xs uppercase tracking-wide text-zinc-600">{item.label}</p>
              <p className="mt-1">{item.body}</p>
            </div>
          ))}
        </div>
      </LegalSection>
    </LegalPageLayout>
  );
}
