import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/app/components/LegalPageLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — FxInsites",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" updated="September 8, 2026">
      <LegalSection title="Overview">
        <p>
          FxInsites (&quot;we&quot;, &quot;us&quot;) is a trade planning, backtesting, and journaling
          tool. This page explains, in plain language, what information we collect, why we collect
          it, and what stays entirely on your own device.
        </p>
      </LegalSection>

      <LegalSection title="Information we collect">
        <p>
          <strong className="text-zinc-200">Account information:</strong> your email address,
          username, and password. Your password is stored as a salted hash — we never store it, and
          can never see it, in plain text.
        </p>
        <p>
          <strong className="text-zinc-200">Trade plan inputs:</strong> when you use the planner, the
          instrument, direction, entry/stop/target details, risk percentage, and any chart screenshot
          you attach are sent to our AI provider to generate your plan, and the result is saved to
          your account so it appears in your journal.
        </p>
        <p>
          <strong className="text-zinc-200">IP address:</strong> used briefly to apply rate limits
          (e.g. login attempts, AI plan requests) so no single user can overload the service. This is
          held in memory only and not stored long-term.
        </p>
        <p>
          <strong className="text-zinc-200">Payment information:</strong> if you subscribe to a paid
          plan, your payment is handled entirely by Paystack. FxInsites never receives or stores your
          card number or bank details — only your subscription tier and status.
        </p>
      </LegalSection>

      <LegalSection title="What stays on your device only">
        <p>
          Your trade journal, saved plan drafts, plan checklists, and risk-calculator inputs are
          stored in your browser&apos;s local storage — never sent to or stored on our servers.
          Clearing your browser data, or switching device or browser, will not carry this information
          over, since we never had a copy of it.
        </p>
      </LegalSection>

      <LegalSection title="How we use your information">
        <ul className="list-disc space-y-2 pl-5">
          <li>To create, secure, and manage your account.</li>
          <li>
            To generate your trade plans and check them against risk-management rules, using
            Anthropic&apos;s Claude AI — your submitted idea and any attached chart image is sent to
            Anthropic for this purpose.
          </li>
          <li>To send account-related emails (verification, password reset) via Resend.</li>
          <li>To process payments via Paystack, if you subscribe to a paid plan.</li>
          <li>
            To fetch live prices, historical price ranges, and economic-calendar data from Twelvedata
            and Financial Modeling Prep — only the instrument symbol or a date range is sent to these
            providers, never anything that identifies you.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          We use one essential cookie to keep you logged in. We don&apos;t use advertising,
          tracking, or analytics cookies of any kind.
        </p>
      </LegalSection>

      <LegalSection title="Data retention and deletion">
        <p>
          We keep your account information for as long as your account is active. You can request
          deletion of your account and associated data at any time by emailing{" "}
          <a href="mailto:hello@fxinsites.com" className="text-sky-400 hover:text-sky-300">
            hello@fxinsites.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          Depending on where you live, you may have rights to access, correct, or delete your
          personal information — for example under South Africa&apos;s Protection of Personal
          Information Act (POPIA), or the EU/UK GDPR if it applies to you. Contact us at{" "}
          <a href="mailto:hello@fxinsites.com" className="text-sky-400 hover:text-sky-300">
            hello@fxinsites.com
          </a>{" "}
          to exercise these rights.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          Passwords are stored using a salted hash, never in plain text, and all traffic to and from
          FxInsites is encrypted (HTTPS).
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          We may update this policy from time to time. Changes will be posted on this page with an
          updated date at the top.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about this policy? Email{" "}
          <a href="mailto:hello@fxinsites.com" className="text-sky-400 hover:text-sky-300">
            hello@fxinsites.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
