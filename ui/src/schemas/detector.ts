import { z } from "zod";

export const personDataSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.coerce.number().min(1, "Age must be positive").max(120, "Invalid age"),
  gender: z.enum(["male", "female"], {
    required_error: "Gender is required",
  }),
  modelKey: z.enum([
    "auto",
    "ckpt_1127_145313",
    "ckpt_1208_153234",
    "ckpt_1214_094941",
    "ckpt_1216_124129",
    "ckpt_1226_093721",
    "ckpt_1228_011726",
    "ckpt_1228_163427",
    "ckpt_1229_024515",
    "ckpt_1229_161540",
    "ckpt_1230_222717",
    "ckpt_1124_171024",
    "ckpt_final",
    "ckpt_final_2",
  ], {
    required_error: "Model selection is required",
  }).default("auto"),
});

export type PersonDataFormData = z.infer<typeof personDataSchema>;
