import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Load Stripe (use your publishable key)
const stripePromise = loadStripe("pk_test_51T44r2J3D6Mr2zVbEyrXNIshEBSZYxPwwFttpYnWjEOTvN4TJmeYWyqT7dRZnURhgUwhIXcIzch0dFyhfnIOL0aO00D04u80bS");

function CheckoutForm({ rentalDetails, rentalId }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Confirm payment on backend
      try {
        const token = localStorage.getItem("token");
        await fetch("http://localhost:5000/api/payment/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rentalId: rentalId,
            paymentIntentId: paymentIntent.id,
          }),
        });

        setMessage("Payment successful! Redirecting...");
        setTimeout(() => navigate("/notifications"), 2000);
      } catch (err) {
        setMessage("Payment processed but confirmation failed");
      }
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "500px", margin: "2rem auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h3>Payment Details</h3>
        <p><strong>Tool:</strong> {rentalDetails?.toolName}</p>
        <p><strong>Price per day:</strong> ${rentalDetails?.pricePerDay}</p>
        <p><strong>Days:</strong> {rentalDetails?.days}</p>
        <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
          <strong>Total:</strong> ${rentalDetails?.total}
        </p>
      </div>

      <PaymentElement />

      {message && (
        <div style={{ 
          marginTop: "1rem", 
          padding: "1rem", 
          background: message.includes("successful") ? "#d4edda" : "#f8d7da",
          color: message.includes("successful") ? "#155724" : "#721c24",
          borderRadius: "4px"
        }}>
          {message}
        </div>
      )}

      <button
        disabled={isLoading || !stripe || !elements}
        style={{
          width: "100%",
          marginTop: "1.5rem",
          padding: "1rem",
          background: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontSize: "1.1rem",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {isLoading ? "Processing..." : `Pay $${rentalDetails?.total}`}
      </button>
    </form>
  );
}

export default function Payment() {
  const { rentalId } = useParams();
  const [clientSecret, setClientSecret] = useState("");
  const [rentalDetails, setRentalDetails] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPaymentIntent = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch("http://localhost:5000/api/payment/create-intent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rentalId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to create payment");
        }

        setClientSecret(data.clientSecret);
        setRentalDetails(data.rentalDetails);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchPaymentIntent();
  }, [rentalId, navigate]);

  if (error) {
    return (
      <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "2rem", textAlign: "center" }}>
        <h2 style={{ color: "#dc3545" }}>Payment Error</h2>
        <p>{error}</p>
        <button
          onClick={() => navigate("/notifications")}
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1.5rem",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Back to Notifications
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        Loading payment...
      </div>
    );
  }

  const appearance = {
    theme: "stripe",
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", padding: "2rem" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", background: "white", borderRadius: "8px", padding: "2rem", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <h1 style={{ textAlign: "center", marginBottom: "2rem" }}>Complete Payment</h1>
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm rentalDetails={rentalDetails} rentalId={rentalId} />
        </Elements>
      </div>
    </div>
  );
}