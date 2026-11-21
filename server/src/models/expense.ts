import { Schema, model } from "mongoose";
import { CATEGORIES, TYPES } from "../schemas/expense.js";

const expenseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Records created before income existed have no `type`; the default treats them as expenses.
    type: { type: String, enum: [...TYPES], default: "expense", index: true },
    amountCents: { type: Number, required: true, min: 1 },
    category: { type: String, required: true, enum: [...CATEGORIES] },
    description: { type: String, trim: true, maxlength: 200 },
    date: { type: Date, required: true, index: true },
  },
  { timestamps: true }, // adds createdAt / updatedAt automatically
);

export const Expense = model("Expense", expenseSchema);
