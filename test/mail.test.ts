import { describe, expect, it, vi } from "vitest";
import { checkEmail } from "../src/email-check/index";
import { MailRejectedError, createMailer } from "../src/mail/index";

describe("createMailer", () => {
    it("prints instead of sending without a key", async () => {
        const info = vi.spyOn(console, "info").mockImplementation(() => {});
        const mailer = createMailer({ apiKey: "", from: "A <a@x.com>" });
        expect(mailer.configured).toBe(false);
        expect(await mailer.send({ to: "b@x.com", subject: "Hi", text: "Body" })).toEqual({
            sent: false,
        });
        expect(info).toHaveBeenCalled();
        info.mockRestore();
    });

    it("throws without a key when one is required", async () => {
        const mailer = createMailer({ apiKey: undefined, from: "A <a@x.com>", requireKey: true });
        await expect(mailer.send({ to: "b@x.com", subject: "Hi", text: "Body" })).rejects.toThrow(
            "RESEND_API_KEY",
        );
    });

    it("posts to Resend and surfaces rejections", async () => {
        const fetcher = vi
            .fn()
            .mockResolvedValueOnce(Response.json({ id: "m1" }))
            .mockResolvedValueOnce(Response.json({ message: "bad from" }, { status: 422 }));
        const mailer = createMailer({ apiKey: "re_1", from: "A <a@x.com>", fetch: fetcher });
        expect(await mailer.send({ to: "b@x.com", subject: "Hi", html: "<p>x</p>" })).toEqual({
            sent: true,
            id: "m1",
        });
        const [, init] = fetcher.mock.calls[0] as [string, RequestInit];
        expect(JSON.parse(String(init.body))).toEqual({
            from: "A <a@x.com>",
            to: "b@x.com",
            subject: "Hi",
            html: "<p>x</p>",
        });
        await expect(
            mailer.send({ to: "b@x.com", subject: "Hi", text: "x" }),
        ).rejects.toBeInstanceOf(MailRejectedError);
    });
});

describe("checkEmail", () => {
    it("normalises and classifies", () => {
        expect(checkEmail("  Ana@Gmail.com ")).toEqual({ ok: true, email: "ana@gmail.com" });
        expect(checkEmail("")).toEqual({ ok: false, reason: "empty" });
        expect(checkEmail("x@guest.app.test", { guestDomain: "guest.app.test" })).toEqual({
            ok: false,
            reason: "guest",
        });
        expect(checkEmail("a@mailinator.com")).toEqual({ ok: false, reason: "disposable" });
    });
});
