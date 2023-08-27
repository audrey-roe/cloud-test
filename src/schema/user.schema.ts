import { boolean, object, string } from "zod";

export const createUserSchema = object({
    body: object({
        name: string({
            required_error: "Full name is required",
        })
            .min(1, {
                message: "Full name is required",
            })
            .refine(name => name.split(' ').length > 1, {
                message: "Full name should have at least first name and last name",
            }),

        password: string({
            required_error: "Password is required",
        }).min(6, "Password too short - should be 6 chars minimum"),

        email: string({
            required_error: "Email is required",
        }).email("Not a valid email"),
        
        is_admin: boolean().default(false), 

    })
});