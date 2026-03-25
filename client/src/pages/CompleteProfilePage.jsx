import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import FaceRegistrationFlow from "@/components/FaceRegistrationFlow";

export default function CompleteProfilePage() {
  const { dbUser } = useAuth();
  const navigate = useNavigate();

  const handleFaceRegistrationSuccess = () => {
    // Redirect to dashboard after face registration
    navigate("/dashboard", { replace: true });
  };

  const handleSkip = () => {
    // Allow user to skip face registration for now
    navigate("/dashboard", { replace: true });
  };

  // If user already has face registered, redirect to dashboard
  if (dbUser?.faceRegistrationCompleted) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  return (
    <FaceRegistrationFlow
      onSuccess={handleFaceRegistrationSuccess}
      onSkip={handleSkip}
    />
  );
}
