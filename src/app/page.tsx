import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-heading text-3xl font-semibold text-text">LeadPort</h1>
      <p className="max-w-md text-text-muted">
        Real estate link-in-bio with lead capture. Under construction.
      </p>
      <Button
        nativeButton={false}
        render={<Link href="/dev/tokens">View design tokens</Link>}
      />
    </div>
  );
}
