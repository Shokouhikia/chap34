// Renders admin-authored plain text as whitespace-preserved paragraphs -
// never as raw HTML. The admin has no way to enter markup (the business-info
// form is plain <textarea>s), so this is the correct/safe rendering for it;
// switching to dangerouslySetInnerHTML later would open an admin-side XSS
// vector and must not be done without adding real sanitization first.
export default function LegalPage({ title, body }: { title: string; body: string }) {
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-extrabold text-navy">{title}</h1>
      {body ? (
        <div className="whitespace-pre-wrap text-[14px] leading-8 text-navy/90">{body}</div>
      ) : (
        <p className="text-sm text-muted">
          محتوای این صفحه هنوز توسط مدیر سایت تکمیل نشده است.
        </p>
      )}
    </article>
  );
}
