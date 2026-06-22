// ============================================================
//  YouTube → MP4 proxy cho thiết bị iOS cũ (iOS 8/9)
//
//  Vì sao cần Worker này:
//   - Safari iOS 8 KHÔNG chạy được player nhúng (Piped/YouTube embed)
//     vì chúng cần JavaScript hiện đại.
//   - YouTube khoá stream theo IP + bỏ định dạng MP4 gộp khi gọi từ
//     trình duyệt thường → gọi trực tiếp luôn fail.
//
//  Worker này dùng InnerTube ANDROID client (trả URL MP4 gộp, KHÔNG
//  bị mã hoá chữ ký), rồi TỰ proxy luồng byte. Vì URL được tạo cho
//  IP của Worker và chính Worker tải byte → IP khớp → không bị 403.
//  iOS 8 phát thẳng được file MP4 này trong thẻ <video>.
//
//  Endpoint:
//   GET /?v=VIDEO_ID        → stream MP4 (dùng cho <video src>)
//   GET /info?v=VIDEO_ID    → JSON thông tin luồng (debug)
// ============================================================

const INNERTUBE_KEY = "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w"; // public ANDROID key

const ANDROID_CONTEXT = {
  context: {
    client: {
      clientName: "ANDROID",
      clientVersion: "19.09.37",
      androidSdkVersion: 30,
      hl: "en",
      gl: "US",
      utcOffsetMinutes: 0,
    },
  },
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Allow-Headers": "Range",
};

async function getPlayerData(videoId) {
  const res = await fetch(
    "https://www.youtube.com/youtubei/v1/player?key=" + INNERTUBE_KEY,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
        "X-Goog-Api-Format-Version": "2",
      },
      body: JSON.stringify({ ...ANDROID_CONTEXT, videoId }),
    }
  );
  return res.json();
}

// Chọn luồng MP4 gộp (có cả audio+video) — ưu tiên 360p cho máy yếu.
function pickMuxed(data) {
  const formats = (data.streamingData && data.streamingData.formats) || [];
  for (const itag of [18, 22]) {
    const f = formats.find((x) => x.itag === itag && x.url);
    if (f) return f;
  }
  return formats.find((x) => x.url && (x.mimeType || "").indexOf("mp4") >= 0) || null;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const videoId = url.searchParams.get("v");
    if (!videoId) {
      return new Response("Thiếu tham số ?v=VIDEO_ID", { status: 400, headers: CORS });
    }

    let data;
    try {
      data = await getPlayerData(videoId);
    } catch (e) {
      return new Response("Lỗi bóc tách video", { status: 502, headers: CORS });
    }

    const ps = data.playabilityStatus && data.playabilityStatus.status;
    if (ps && ps !== "OK") {
      return new Response("Video không phát được: " + ps, { status: 403, headers: CORS });
    }

    const fmt = pickMuxed(data);
    if (!fmt) {
      return new Response("Không có luồng MP4 gộp", { status: 404, headers: CORS });
    }

    // Chế độ debug: trả thông tin luồng
    if (url.pathname === "/info") {
      return new Response(
        JSON.stringify({ itag: fmt.itag, mimeType: fmt.mimeType, quality: fmt.qualityLabel }),
        { headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Proxy byte — chuyển tiếp Range để <video> tua được.
    const upstreamHeaders = {};
    const range = request.headers.get("Range");
    if (range) upstreamHeaders["Range"] = range;

    const upstream = await fetch(fmt.url, { headers: upstreamHeaders });

    const respHeaders = new Headers();
    // Giữ các header quan trọng cho video seeking
    for (const h of ["content-length", "content-range", "accept-ranges", "content-type"]) {
      const val = upstream.headers.get(h);
      if (val) respHeaders.set(h, val);
    }
    if (!respHeaders.get("content-type")) respHeaders.set("Content-Type", "video/mp4");
    respHeaders.set("Accept-Ranges", "bytes");
    for (const k in CORS) respHeaders.set(k, CORS[k]);

    return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
  },
};
