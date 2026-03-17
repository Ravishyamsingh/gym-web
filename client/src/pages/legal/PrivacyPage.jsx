import PolicyLayout from "./PolicyLayout";

export default function PrivacyPage() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      subtitle="How we collect, use, and protect your personal information."
      updatedOn="March 17, 2026"
    >
      <section>
        <h2 className="text-lg font-semibold text-white">1. Information We Collect</h2>
        <p>
          We may collect name, email, user ID, attendance records, membership details, and payment status required to
          provide gym services.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">2. Purpose of Data Processing</h2>
        <p>
          Data is used for authentication, membership management, payment processing, attendance tracking, and customer
          support.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">3. Data Sharing</h2>
        <p>
          We do not sell personal data. We share limited information with service providers strictly required for
          payment processing, authentication, and communications.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">4. Data Security</h2>
        <p>
          We implement reasonable technical and organizational safeguards to protect personal data from unauthorized
          access and misuse.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">5. Contact for Privacy Requests</h2>
        <p>
          For correction or deletion requests, contact us using the details on the Contact Us page.
        </p>
      </section>
    </PolicyLayout>
  );
}
