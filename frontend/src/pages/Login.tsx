import AuthLayout from "../layouts/AuthLayout";
import SigninForm from "../features/auth/components/SigninForm";

export default function Login() {
  return (
    <AuthLayout>
      <SigninForm />
    </AuthLayout>
  );
}
