import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";

/**
 * Bridge between Zod and React Hook Form.
 *
 * Several of our schemas deliberately differ on input and output: form fields
 * arrive as forgiving strings (`z.coerce.number()`) and empty values normalise to
 * `null`, so the same schema can accept browser input and still hand the server
 * action fully typed data. React Hook Form's generic inference cannot follow
 * those transforms.
 *
 * This helper applies the real resolver (so validation genuinely runs, client
 * side, with the same rules the server uses) and pins the field-value type to the
 * schema's OUTPUT type, which is what our submit handlers consume.
 *
 * The single cast is intentional and lives here rather than being repeated in
 * every form.
 */
export function formResolver<TOutput extends FieldValues>(schema: unknown): Resolver<TOutput> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see the note above
  return zodResolver(schema as any) as unknown as Resolver<TOutput>;
}
