import PolicyLayout from "./PolicyLayout";

export default function RefundPolicyPage() {
  return (
    <PolicyLayout
      title="Cancellation and Refund Policy"
      subtitle="Policy for membership cancellation and refund handling."
      updatedOn="March 17, 2026"
    >
      <section>
        <h2 className="text-lg font-semibold text-white">1. Cancellation Requests</h2>
        <p>
          Cancellation requests must be made through the support contact channels with your registered account details.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">2. Refund Eligibility</h2>
        <p>
          Refunds are evaluated on a case-by-case basis subject to payment status, service usage, and applicable
          regulatory requirements.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">3. Processing Timeline</h2>
        <p>
          Approved refunds are initiated to the original payment method. Timeline depends on bank and payment provider
          processing cycles.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">4. Non-Refundable Cases</h2>
        <p>
          Fraudulent transactions, policy abuse, and completed usage beyond fair limits may be excluded from refunds as
          per platform rules and law.
        </p>
      </section>
    </PolicyLayout>
  );
}
