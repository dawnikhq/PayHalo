import { redirect } from "next/navigation";

/** The old single-page setup is superseded by the six-step plan flow. */
export default function OnboardingPage() {
  redirect("/plan/start");
}
