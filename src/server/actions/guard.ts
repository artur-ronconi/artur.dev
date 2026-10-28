import "server-only";

import { toUserMessage } from "@/server/db/errors";
import { assertCsrf, requireUser, type SessionUser } from "@/server/auth/session";
import {
  CSRF_MESSAGE,
  UNAUTHORIZED_MESSAGE,
  type ActionResult,
} from "@/server/actions/result";

/**
 * Wraps every admin mutation: authenticates on the server, validates the
 * double-submit CSRF token and converts thrown errors into UI messages.
 */
export async function adminAction<T>(
  csrfToken: string | undefined | null,
  handler: (user: SessionUser) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  let user: SessionUser;

  try {
    user = await requireUser();
  } catch {
    return { ok: false, message: UNAUTHORIZED_MESSAGE };
  }

  try {
    await assertCsrf(csrfToken);
  } catch {
    return { ok: false, message: CSRF_MESSAGE };
  }

  try {
    return await handler(user);
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}
