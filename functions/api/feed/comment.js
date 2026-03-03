import { errorResponse, json, supabaseRequest } from "../../_lib/supabase.js";

export async function onRequestPost(context) {
  let payload;

  try {
    payload = await context.request.json();
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "잘못된 요청", "JSON 요청 본문이 필요합니다.");
  }

  const row = {
    post_id: payload.post_id,
    author: payload.author || "게스트",
    body: payload.body || ""
  };

  if (!row.post_id || !row.body) {
    return errorResponse(400, "MISSING_FIELDS", "필수값 누락", "post_id와 body는 필수입니다.");
  }

  try {
    const created = await supabaseRequest(
      context,
      "comments",
      {
        method: "POST",
        headers: {
          Prefer: "return=representation"
        },
        body: JSON.stringify(row)
      }
    );

    return json({
      comment: Array.isArray(created) ? created[0] : created
    });
  } catch (error) {
    if (error.message === "SUPABASE_ENV_MISSING") {
      return errorResponse(
        500,
        "SUPABASE_ENV_MISSING",
        "Supabase 환경 변수 누락",
        "SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다."
      );
    }

    return errorResponse(
      error.status || 500,
      "COMMENT_CREATE_FAILED",
      "댓글 생성 실패",
      error.message || "실제 댓글 생성에 실패했습니다."
    );
  }
}
