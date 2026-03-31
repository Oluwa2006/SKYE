import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function DELETE() {
  const { error } = await supabase
    .from("ideas")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
