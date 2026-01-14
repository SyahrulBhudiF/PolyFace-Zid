import { z } from "zod";

export const personDataSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.coerce.number().min(1, "Age must be positive").max(120, "Invalid age"),
  gender: z.enum(["male", "female"], {
    required_error: "Gender is required",
  }),
});

export type PersonDataFormData = z.infer<typeof personDataSchema>;
