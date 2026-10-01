import { redirect } from "next/navigation";

/**
 * Convenience alias. The canonical dashboard lives at `/admin`, matching the
 * route list in the product spec; this keeps `/admin/dashboard` working for
 * anyone who types it.
 */
export default function DashboardAliasPage() {
  redirect("/admin");
}
