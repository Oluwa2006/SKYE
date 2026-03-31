import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function DELETE() {
  // Delete analyses first (foreign key references posts)
  const { error: analysisError } = await supabase
    .from("analysis")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (analysisError) {
    return NextResponse.json({ error: analysisError.message }, { status: 500 });
  }

  const { error: postsError } = await supabase
    .from("posts")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (postsError) {
    return NextResponse.json({ error: postsError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
