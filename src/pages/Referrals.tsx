import { AppNav } from "@/components/layout/AppNav";
import { ReferralRequestManager } from "@/components/contacts/ReferralRequestManager";

export default function Referrals() {
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="container mx-auto px-4 py-8">
        <ReferralRequestManager />
      </main>
    </div>
  );
}