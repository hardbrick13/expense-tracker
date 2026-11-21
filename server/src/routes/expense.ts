import { Router } from "express";
import mongoose from "mongoose";
import { Expense } from "../models/expense.js";
import { requireAuth } from "../middleware/auth.js";
import { createExpenseSchema, updateExpenseSchema } from "../schemas/expense.js";

export const expensesRouter = Router();

// Every expense route needs a logged-in user, and only ever sees that user's entries.
expensesRouter.use(requireAuth);

// GET /api/expenses — newest first
expensesRouter.get("/", async (req, res) => {
  const expenses = await Expense.find({ userId: req.userId }).sort({ date: -1 });
  res.json(expenses);
});

// POST /api/expenses
expensesRouter.post("/", async (req, res) => {
  const data = createExpenseSchema.parse(req.body);
  const expense = await Expense.create({ ...data, userId: req.userId });
  res.status(201).json(expense);
});

// PATCH /api/expenses/:id
expensesRouter.patch("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  const data = updateExpenseSchema.parse(req.body);
  const expense = await Expense.findOne({ _id: req.params.id, userId: req.userId });
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  // Re-validate the merged record so type/category always stay consistent
  const merged = createExpenseSchema.parse({ ...expense.toObject(), ...data });
  expense.set({ ...merged, userId: req.userId });
  await expense.save();
  res.json(expense);
});

// DELETE /api/expenses/:id
expensesRouter.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  res.status(204).end();
});