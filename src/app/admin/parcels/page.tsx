import { redirect } from "next/navigation";

export default function AdminParcelsRedirect() {
  redirect("/staff/parcels");
}
