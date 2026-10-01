import { QrStatusScreen } from "@/components/qr/qr-status-screen";

/**
 * Unknown or malformed QR codes land here with a real 404 status, so crawlers
 * and link checkers see a missing page while visitors get the friendly screen.
 */
export default function QrNotFound() {
  return <QrStatusScreen problem="not_found" />;
}
