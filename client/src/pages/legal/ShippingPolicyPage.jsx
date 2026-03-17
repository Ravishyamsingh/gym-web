import PolicyLayout from "./PolicyLayout";

export default function ShippingPolicyPage() {
  return (
    <PolicyLayout
      title="Shipping Policy"
      subtitle="Clarification on delivery for gym membership services."
      updatedOn="March 17, 2026"
    >
      <section>
        <h2 className="text-lg font-semibold text-white">Digital Service Notice</h2>
        <p>
          Om Muruga Olympia Fitness provides membership and access services digitally. No physical products are shipped
          for membership purchases made on this website.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Membership Activation Timeline</h2>
        <p>
          Membership activation usually occurs shortly after successful payment verification. In case of payment
          verification delays, activation may take additional processing time.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Support</h2>
        <p>
          If your membership is not activated after payment, please contact support with your registered email and
          transaction reference.
        </p>
      </section>
    </PolicyLayout>
  );
}
