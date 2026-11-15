import { z } from "zod";

export const DraftItemSchema = z.object({
  fisherman_name: z.string(),
  type: z.enum(["catch", "advance", "repayment"]),
  species: z.string().nullable(),
  weight_kg: z.number().nullable(),
  price_per_kg: z.number().nullable(),
  amount: z.number(),
  note: z.string().nullable(),
});

export const DraftSchema = z.object({
  items: z.array(DraftItemSchema),
  confidence: z.number().min(0).max(1),
  unclear: z.array(z.string()),
});

export type Draft = z.infer<typeof DraftSchema>;
export type DraftItem = z.infer<typeof DraftItemSchema>;

export interface EnrichedDraftItem extends DraftItem {
  matched_fisherman_id: string | null;
  matched_fisherman_name: string | null;
  match_confidence: number;
  needs_manual_fisherman: boolean;
}
