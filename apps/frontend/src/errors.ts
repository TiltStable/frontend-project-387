// hey-api при throwOnError: false резолвит промис и с ошибкой ({error} —
// тело ответа или текст сбоя), и с сетевым сбоем. Нормализуем всё это
// в человекочитаемый текст.
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return "Что-то пошло не так. Попробуйте ещё раз.";
}
