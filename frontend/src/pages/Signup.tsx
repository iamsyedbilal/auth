import AuthLayout from "../layouts/AuthLayout";
import SignupForm from "../features/auth/components/SignupForm";

export default function Signup() {
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}
