import type { Metadata } from "next";
import { getBusinessInfo } from "@/lib/content";
import ContactForm from "./ContactForm";

export const metadata: Metadata = { title: "تماس با ما" };

export default async function ContactPage() {
  const info = await getBusinessInfo();
  const hasContactInfo = info.biz_phone || info.biz_email || info.biz_address;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-extrabold text-navy">تماس با ما</h1>

      {hasContactInfo && (
        <div className="card mb-6">
          <ul className="space-y-2 text-sm text-navy/90">
            {info.biz_phone && (
              <li>
                تلفن:{" "}
                <a href={`tel:${info.biz_phone}`} className="font-bold text-purple-deep" dir="ltr">
                  {info.biz_phone}
                </a>
              </li>
            )}
            {info.biz_email && (
              <li>
                ایمیل:{" "}
                <a href={`mailto:${info.biz_email}`} className="font-bold text-purple-deep" dir="ltr">
                  {info.biz_email}
                </a>
              </li>
            )}
            {info.biz_address && <li>آدرس: {info.biz_address}</li>}
          </ul>
        </div>
      )}

      <ContactForm />
    </div>
  );
}
