import { FieldError } from "../generated/graphql";

//utility function to convert array of errors to an object of errors
export const toErrorMap = (errors: FieldError[]) => {
    const errorMap: Record<string, string> = {};
    errors.forEach(({field, message}) => {
        errorMap[field] = message;
    });

    return errorMap;
}
