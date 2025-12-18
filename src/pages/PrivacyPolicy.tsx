import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Privacy Policy</h1>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground">
            <strong>Last updated:</strong> November 2025
          </p>

          <h2>1. Overview</h2>
          <p>
            SetDM ("we," "us," "our") operates an API that helps fitness and creator-focused teams
            authenticate with Meta/Instagram, receive webhook notifications, and store Instagram
            account metadata securely. This policy explains how we collect, use, and protect personal
            data processed through our backend service.
          </p>

          <h2>2. Data We Collect</h2>
          <ul>
            <li>
              <strong>Instagram OAuth Data:</strong> Instagram user ID, username, account type,
              short-lived token, long-lived token, and token-expiration metadata created during the
              OAuth flow.
            </li>
            <li>
              <strong>Webhook Payloads:</strong> Verification challenges plus Instagram update
              payloads delivered to <code>/api/webhooks/instagram</code>. These payloads are logged
              transiently and stored in-memory for the inspection endpoint.
            </li>
            <li>
              <strong>System & Usage Data:</strong> Request metadata (timestamps, endpoint paths,
              limited IP-derived information) captured in server logs for observability and
              debugging.
            </li>
            <li>
              <strong>Configuration Secrets:</strong> App credentials supplied via environment
              variables (Instagram App ID/Secret, webhook verify token, Mongo URI). These remain on
              the server and are never shared externally.
            </li>
          </ul>

          <h2>3. How We Use Data</h2>
          <ul>
            <li>Authenticate users with Instagram and return tokens to authorized clients.</li>
            <li>
              Persist Instagram profile and token metadata in MongoDB (<code>instagram_users</code>{" "}
              collection) so clients can manage their integrations.
            </li>
            <li>Validate and log webhook requests from Meta for monitoring and troubleshooting.</li>
            <li>Secure the service, diagnose issues, and improve reliability/performance.</li>
            <li>Comply with legal obligations and enforce platform terms.</li>
          </ul>

          <h2>4. Token & Messaging Data</h2>
          <ul>
            <li>
              Tokens are stored encrypted-at-rest within the configured MongoDB deployment (MongoDB
              Atlas or equivalent). Only authorized service components can access them.
            </li>
            <li>
              Webhook payloads are used solely to confirm delivery and are not repurposed for
              marketing.
            </li>
            <li>
              No automated outbound messaging occurs within this backend. Clients control how
              returned tokens are used downstream.
            </li>
            <li>
              Users can revoke or request deletion of stored data by contacting us (see Section 13).
            </li>
          </ul>

          <h2>5. Data Sharing</h2>
          <p>We do not sell personal data. We share limited data only with:</p>
          <ul>
            <li>
              <strong>Meta Platforms:</strong> As required to complete OAuth flows and receive
              webhook notifications.
            </li>
            <li>
              <strong>Infrastructure Providers:</strong> Hosting (e.g., Vercel) and MongoDB Atlas to
              operate the service.
            </li>
            <li>
              <strong>Legal Authorities:</strong> If compelled by law or to enforce agreements.
            </li>
            <li>
              <strong>Business Transfers:</strong> In the event of merger, acquisition, or
              reorganization—subject to this policy's safeguards.
            </li>
          </ul>

          <h2>6. Security</h2>
          <ul>
            <li>
              All endpoints require HTTPS. Secrets are injected via environment variables and
              excluded from source control.
            </li>
            <li>Access controls, monitoring, and logging protect production systems.</li>
            <li>
              Despite safeguards, no system is completely secure; we continuously patch dependencies
              and monitor for threats.
            </li>
            <li>
              If a data breach likely affects personal information, we will notify impacted users
              and authorities within 72 hours where legally required.
            </li>
          </ul>

          <h2>7. Data Retention</h2>
          <ul>
            <li>
              Instagram user records (profile + token metadata) persist until the account is removed
              or 60 days after access is revoked, whichever occurs first.
            </li>
            <li>
              Webhook payloads are stored only in-memory and cleared whenever the process restarts;
              log entries follow standard operational retention (≤30 days unless law requires
              longer).
            </li>
            <li>Backups inherit the same retention policies as their source data.</li>
          </ul>

          <h2>8. User Rights</h2>
          <p>Depending on jurisdiction (GDPR, CCPA, etc.), users may:</p>
          <ul>
            <li>Access, correct, delete, or export the Instagram data we store.</li>
            <li>Object to certain processing or request restrictions.</li>
            <li>Withdraw consent where applicable.</li>
          </ul>
          <p>
            To exercise rights, email{" "}
            <a href="mailto:ayden14567@gmail.com" className="text-primary hover:underline">
              ayden14567@gmail.com
            </a>
            . We may need to verify identity and Meta account ownership.
          </p>

          <h2>9. International Transfers</h2>
          <p>
            Data may be processed in the United States or other countries where our infrastructure
            providers operate. We rely on Standard Contractual Clauses or comparable safeguards for
            cross-border transfers when required.
          </p>

          <h2>10. Cookies & Tracking</h2>
          <p>
            This backend does not set cookies. If deployed behind a separate frontend, refer to that
            product's cookie policy. Server logs capture IP addresses and headers strictly for
            security and analytics.
          </p>

          <h2>11. Children's Privacy</h2>
          <p>
            The service targets business users and is not intended for individuals under 18. If we
            become aware that we processed data for a minor, we will delete it promptly.
          </p>

          <h2>12. Policy Updates</h2>
          <p>
            We may update this policy as the product evolves (e.g., new Meta endpoints, automation
            features). Updates take effect upon posting the new version. We will provide notice of
            material changes through release notes or direct communication when required.
          </p>

          <h2>13. Contact Us</h2>
          <p>For privacy questions or data-rights requests:</p>
          <ul>
            <li>
              Email:{" "}
              <a href="mailto:ayden14567@gmail.com" className="text-primary hover:underline">
                ayden14567@gmail.com
              </a>
            </li>
          </ul>

          <hr className="my-8" />

          <p className="text-sm text-muted-foreground">
            If you have any further questions about this policy or need additional language (e.g.,
            DPA/SCC references), feel free to contact us.
          </p>
        </article>
      </main>
    </div>
  );
}

