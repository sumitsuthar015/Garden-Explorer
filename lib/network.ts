import net from "node:net";

const ATTEMPT_TIMEOUT_MS = 1500;

/**
 * Give each database address long enough to answer.
 *
 * Node's "happy eyeballs" connects to a host's addresses in turn, allowing each
 * only 250 ms before abandoning it for the next. Across a long link — say from
 * India to a US database region — a TCP handshake takes longer than that, so on
 * a network without working IPv6 every attempt is abandoned and connections
 * fail at random. Call before opening a database pool.
 */
export function allowSlowNetworkHandshakes(): void {
  if (net.getDefaultAutoSelectFamilyAttemptTimeout() < ATTEMPT_TIMEOUT_MS) {
    net.setDefaultAutoSelectFamilyAttemptTimeout(ATTEMPT_TIMEOUT_MS);
  }
}
