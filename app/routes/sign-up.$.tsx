import { SignUp } from "@clerk/remix";

export default function SignUpPage() {
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <SignUp />
    </div>
  );
}
