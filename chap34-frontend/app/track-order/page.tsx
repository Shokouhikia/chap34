import type { Metadata } from "next";
import TrackOrderForm from "./TrackOrderForm";

export const metadata: Metadata = { title: "پیگیری سفارش" };

export default function TrackOrderPage() {
  return <TrackOrderForm />;
}
