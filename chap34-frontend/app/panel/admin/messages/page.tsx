"use client";

import { useEffect, useState } from "react";
import { panelApi, ContactMessageRow } from "@/lib/panelApi";

export default function AdminMessagesPage() {
  const [rows, setRows] = useState<ContactMessageRow[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  function load() {
    panelApi
      .listContactMessages()
      .then((d) => setRows(d.messages))
      .catch(() => setRows([]));
  }
  useEffect(load, []);

  async function open(row: ContactMessageRow) {
    setOpenId(openId === row.id ? null : row.id);
    if (!row.is_read) {
      await panelApi.markContactMessageRead(row.id);
      load();
    }
  }

  if (!rows) return <p className="text-muted">در حال بارگذاری...</p>;

  return (
    <div className="card">
      <h2 className="text-lg font-extrabold mb-4">📩 پیام‌های تماس با ما</h2>
      {rows.length === 0 ? (
        <p className="text-muted text-sm">پیامی دریافت نشده است.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="border border-line rounded-md2 overflow-hidden">
              <button
                onClick={() => open(row)}
                className={`flex w-full items-center justify-between px-4 py-3 text-right ${
                  !row.is_read ? "bg-purple-tint" : ""
                }`}
              >
                <span className="flex items-center gap-2 text-[13px]">
                  {!row.is_read && <span className="h-2 w-2 rounded-full bg-purple" />}
                  <b className="font-bold text-navy">{row.subject}</b>
                  <span className="text-muted">— {row.name}</span>
                </span>
                <span className="text-xs text-muted">{new Date(row.created_at).toLocaleDateString("fa-IR")}</span>
              </button>
              {openId === row.id && (
                <div className="px-4 py-3 border-t border-line text-[13px] text-navy/90">
                  <p className="mb-2 text-muted">
                    تلفن: <span dir="ltr">{row.phone}</span>
                    {row.email && (
                      <>
                        {" "}
                        — ایمیل: <span dir="ltr">{row.email}</span>
                      </>
                    )}
                  </p>
                  <p className="whitespace-pre-wrap">{row.message}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
