import PolicyLayout from "./PolicyLayout";

export default function ContactPage() {
  return (
    <PolicyLayout
      title="Contact Us"
      subtitle="Reach our support team for membership, payment, and account help."
      updatedOn="March 17, 2026"
    >
      <section>
        <h2 className="text-lg font-semibold text-white">Support Channels</h2>
        <p>Email: massmanikanta70@gmail.com</p>
        <p>Phone: +91 8925148138</p>
        <p>Address: Vatrap Road, near Petrol Bunk Krishnan Kovil, Tamil Nadu</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Support Hours</h2>
        <p>Monday to Saturday: 5:00 AM - 9:00 AM and 4:00 PM - 9:00 PM</p>
        <p>Sunday: Closed</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">What to Include in Your Query</h2>
        <p>
          Please share your registered email, user ID, and payment reference (if applicable) for faster support.
        </p>
      </section>
    </PolicyLayout>
  );
}
