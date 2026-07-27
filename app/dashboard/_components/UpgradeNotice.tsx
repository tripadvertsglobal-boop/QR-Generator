import Link from "next/link";
import { Card, CardBody } from "@/app/_components/ui/Card";
import { buttonClasses } from "@/app/_components/ui/Button";

// Shown in place of a feature the current plan does not include. The API already
// returns 402 for these (see lib/plan.ts); this is what stops a free user from
// filling in a form only to have it fail on submit.
export default function UpgradeNotice({
  feature,
  description,
}: {
  feature: string;
  description: string;
}) {
  return (
    <Card>
      <CardBody className="flex flex-col items-start gap-3 py-8 text-center sm:items-center">
        <h2 className="text-base font-medium">{feature} is a Pro feature</h2>
        <p className="max-w-md text-sm text-muted sm:text-center">{description}</p>
        <Link href="/pricing" className={buttonClasses("primary", "md", "mt-1")}>
          See plans
        </Link>
      </CardBody>
    </Card>
  );
}
