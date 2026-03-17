import PolicyLayout from "./PolicyLayout";

export default function TermsPage() {
  return (
    <PolicyLayout
      title="Terms and Conditions"
      subtitle="These terms govern the use of our website, membership, and payment services."
      updatedOn="March 17, 2026"
    >
      <section>
        <h2 className="text-lg font-semibold text-white">1. Membership Eligibility</h2>
        <p>
          Users must provide valid registration details to create an account. A membership becomes active only after
          successful payment verification.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">2. Account Security</h2>
        <p>
          You are responsible for maintaining confidentiality of your login credentials. You must notify us immediately
          if unauthorized access is suspected.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">3. Attendance Verification</h2>
        <p>
          Gym entry and exit may require face verification. When face verification fails, OTP fallback verification is
          available on the registered email address.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">4. Payments</h2>
        <p>
          Payments are processed through Razorpay. A membership is considered valid only when payment is confirmed by
          the payment provider and backend verification.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">5. Suspension and Termination</h2>
        <p>
          We reserve the right to suspend or terminate access in case of fraud, policy abuse, or behavior affecting
          safety and operations.
        </p>
      </section>
    </PolicyLayout>
  );
}
