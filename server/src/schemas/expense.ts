import { z } from "zod";

export const TYPES = ["expense", "income"] as const;

export const EXPENSE_CATEGORIES = [
  "food", "transport", "rent", "bills",
  "shopping", "entertainment", "health", "other",
] as const;

export const INCOME_CATEGORIES = [
  "salary", "business", "investment", "gift", "refund", "other",
] as const;

export const CATEGORIES = [
  ...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]),
] as [string, ...string[]];

const baseSchema = z.object({
  type: z.enum(TYPES).default("expense"),
  amountCents: z.number().int().positive(),   // $12.50 → 1250
  category: z.enum(CATEGORIES),
  description: z.string().trim().max(200).optional(),
  date: z.coerce.date(),
});

function categoryMatchesType(
  data: { type?: (typeof TYPES)[number]; category?: string },
  ctx: z.RefinementCtx,
) {
  if (!data.type || !data.category) return;
  const allowed: readonly string[] =
    data.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (!allowed.includes(data.category)) {
    ctx.addIssue({
      code: "custom",
      path: ["category"],
      message: `"${data.category}" is not a valid ${data.type} category`,
    });
  }
}

export const createExpenseSchema = baseSchema.superRefine(categoryMatchesType);

// For updates every field is optional (and `type` gets no default). If only one of
// type/category is sent, the route checks the combination against the stored record.
export const updateExpenseSchema = baseSchema
  .extend({ type: z.enum(TYPES).optional() })
  .partial()
  .superRefine(categoryMatchesType);

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
