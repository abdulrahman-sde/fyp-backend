import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "HireFlow <noreply@mail.abdulrahmanasif.dev>";

export async function sendShortlistEmail(opts: {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  customQuestions?: string[];
}): Promise<void> {
  const questionsHtml =
    opts.customQuestions && opts.customQuestions.length > 0
      ? `<p style="margin-top:24px;font-weight:600;">Interview Questions</p>
         <ol style="padding-left:20px;color:#374151;">${opts.customQuestions.map((q) => `<li style="margin-bottom:8px;">${q}</li>`).join("")}</ol>`
      : "";

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `You've been shortlisted for ${opts.jobTitle} at ${opts.companyName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827;">
        <h2 style="font-size:22px;font-weight:700;margin-bottom:8px;">Congratulations, ${opts.candidateName}!</h2>
        <p style="color:#6b7280;margin-bottom:24px;">
          You've been shortlisted for the <strong>${opts.jobTitle}</strong> position at <strong>${opts.companyName}</strong>.
          Our team was impressed with your profile and would like to move forward with an interview.
        </p>
        ${questionsHtml}
        <p style="margin-top:32px;color:#6b7280;font-size:13px;">
          We'll be in touch shortly with the next steps. If you have any questions, reply to this email.
        </p>
        <p style="margin-top:8px;color:#6b7280;font-size:13px;">— The HireFlow Team</p>
      </div>
    `,
  });
}

export async function sendRejectionEmail(opts: {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  rejectionReason?: string;
}): Promise<void> {
  const reasonHtml = opts.rejectionReason
    ? `<p style="color:#6b7280;margin-top:16px;font-style:italic;">"${opts.rejectionReason}"</p>`
    : "";

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Your application for ${opts.jobTitle} at ${opts.companyName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827;">
        <h2 style="font-size:22px;font-weight:700;margin-bottom:8px;">Hi ${opts.candidateName},</h2>
        <p style="color:#6b7280;margin-bottom:16px;">
          Thank you for your interest in the <strong>${opts.jobTitle}</strong> role at <strong>${opts.companyName}</strong>
          and for taking the time to apply.
        </p>
        <p style="color:#6b7280;">
          After careful consideration, we've decided to move forward with other candidates whose experience
          more closely matches our current needs.
        </p>
        ${reasonHtml}
        <p style="margin-top:32px;color:#6b7280;">
          We appreciate your effort and encourage you to apply for future openings that match your background.
        </p>
        <p style="margin-top:8px;color:#6b7280;font-size:13px;">— The HireFlow Team</p>
      </div>
    `,
  });
}
