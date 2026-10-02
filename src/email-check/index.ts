import { isValid } from "mailchecker";

export type EmailRejection = "empty" | "malformed" | "guest" | "disposable";

export type EmailCheck = { ok: true; email: string } | { ok: false; reason: EmailRejection };

export type EmailCheckOptions = {
    guestDomain?: string;
};

const MAX_LENGTH = 254;

export function isGuestEmail(email: string, guestDomain: string): boolean {
    return email.toLowerCase().endsWith(`@${guestDomain.toLowerCase()}`);
}

export function checkEmail(input: string, options: EmailCheckOptions = {}): EmailCheck {
    const email = input.trim().toLowerCase();
    if (email.length === 0) return { ok: false, reason: "empty" };
    if (email.length > MAX_LENGTH) return { ok: false, reason: "malformed" };
    if (options.guestDomain && isGuestEmail(email, options.guestDomain)) {
        return { ok: false, reason: "guest" };
    }
    if (!isValid(email)) return { ok: false, reason: "disposable" };
    return { ok: true, email };
}
