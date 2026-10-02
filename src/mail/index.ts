const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type Mail = {
    to: string;
    subject: string;
    text?: string;
    html?: string;
};

export type MailerOptions = {
    apiKey: string | undefined;
    from: string;
    requireKey?: boolean;
    fetch?: typeof fetch;
};

export type MailResult = { sent: true; id: string | null } | { sent: false };

export type Mailer = {
    configured: boolean;
    send: (mail: Mail) => Promise<MailResult>;
};

export class MailRejectedError extends Error {
    constructor(
        readonly status: number,
        detail: string,
    ) {
        super(`Resend rejected the message: ${detail}`);
        this.name = "MailRejectedError";
    }
}

function printInstead(mail: Mail): void {
    const body =
        mail.text ??
        mail.html
            ?.replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    console.info(
        `\n[mail] RESEND_API_KEY not set, printing instead.\n  to: ${mail.to}\n  ${mail.subject}\n\n${body ?? ""}\n`,
    );
}

async function rejectionDetail(response: Response): Promise<string> {
    const raw = await response.text().catch(() => "");
    try {
        const parsed = JSON.parse(raw) as { message?: unknown };
        if (typeof parsed.message === "string") return parsed.message;
    } catch {}
    return raw.slice(0, 300) || `HTTP ${response.status}`;
}

export function createMailer(options: MailerOptions): Mailer {
    const apiKey = options.apiKey?.trim() ?? "";
    const send = options.fetch ?? fetch;

    return {
        configured: apiKey !== "",
        async send(mail) {
            if (!mail.text && !mail.html) throw new Error("A mail needs a text or html body");
            if (apiKey === "") {
                if (options.requireKey) {
                    throw new Error("RESEND_API_KEY is not set; cannot send mail");
                }
                printInstead(mail);
                return { sent: false };
            }
            const response = await send(RESEND_ENDPOINT, {
                method: "POST",
                headers: {
                    authorization: `Bearer ${apiKey}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    from: options.from,
                    to: mail.to,
                    subject: mail.subject,
                    ...(mail.text ? { text: mail.text } : {}),
                    ...(mail.html ? { html: mail.html } : {}),
                }),
            });
            if (!response.ok) {
                throw new MailRejectedError(response.status, await rejectionDetail(response));
            }
            const payload = (await response.json().catch(() => ({}))) as { id?: unknown };
            return { sent: true, id: typeof payload.id === "string" ? payload.id : null };
        },
    };
}
