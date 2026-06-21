// ============================================================
//  CẤU HÌNH - THAY API KEY VÀO ĐÂY
//  Lấy key miễn phí tại: https://console.cloud.google.com
//  Bước: Tạo project → Bật "YouTube Data API v3" → Credentials → API Key
// ============================================================
var API_KEY = '__YOUTUBE_API_KEY__';

var MAX_RESULTS = 20;
var API_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

// ============================================================
//  DOM refs
// ============================================================
var searchInput = document.getElementById('search-input');
var resultsDiv  = document.getElementById('results');
var apiBanner   = document.getElementById('api-banner');

// ============================================================
//  Khởi tạo
// ============================================================
(function init() {
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    apiBanner.classList.remove('hidden');
  }

  // Khôi phục từ khóa tìm kiếm cuối (khi quay lại từ player.html)
  try {
    var saved = sessionStorage.getItem('ytb_query');
    if (saved) {
      searchInput.value = saved;
      doSearch();
    }
  } catch (e) {}

  // Bắt phím Enter trên bàn phím iOS
  searchInput.addEventListener('keydown', function (e) {
    if (e.keyCode === 13) {
      searchInput.blur();
      doSearch();
    }
  });
})();

// ============================================================
//  TÌM KIẾM
// ============================================================
function doSearch() {
  var query = searchInput.value.trim();
  if (!query) return;
  try { sessionStorage.setItem('ytb_query', query); } catch (e) {}

  if (API_KEY === 'YOUR_API_KEY_HERE') {
    showError('Chưa có API Key!\nThêm key vào biến API_KEY trong file app.js\nXem hướng dẫn tại: console.cloud.google.com');
    return;
  }

  showLoading();

  var url = API_SEARCH_URL
    + '?part=snippet'
    + '&type=video'
    + '&maxResults=' + MAX_RESULTS
    + '&key=' + encodeURIComponent(API_KEY)
    + '&q=' + encodeURIComponent(query);

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.timeout = 15000; // 15s timeout cho mạng chậm

  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return;

    if (xhr.status === 200) {
      var data = JSON.parse(xhr.responseText);
      renderResults(data.items || []);
    } else {
      var errMsg = 'Lỗi kết nối (' + xhr.status + ')';
      try {
        var errData = JSON.parse(xhr.responseText);
        if (errData.error && errData.error.message) {
          errMsg = errData.error.message;
        }
      } catch (e) { /* ignore */ }
      showError(errMsg);
    }
  };

  xhr.ontimeout = function () {
    showError('Hết thời gian chờ. Kiểm tra kết nối mạng.');
  };

  xhr.onerror = function () {
    showError('Lỗi mạng. Kiểm tra kết nối internet.');
  };

  xhr.send();
}

// ============================================================
//  HIỂN THỊ KẾT QUẢ
// ============================================================
function renderResults(items) {
  if (!items.length) {
    resultsDiv.innerHTML =
      '<div class="empty">' +
        '<div class="empty-icon">&#128269;</div>' +
        '<div class="empty-text">Không tìm thấy kết quả</div>' +
      '</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < items.length; i++) {
    var item = items[i];

    // Bỏ qua nếu không phải video
    if (!item.id || !item.id.videoId) continue;

    var videoId  = item.id.videoId;
    var title    = item.snippet.title;
    var channel  = item.snippet.channelTitle;
    var thumbs   = item.snippet.thumbnails;
    var thumbUrl = thumbs.medium ? thumbs.medium.url
                 : thumbs.default ? thumbs.default.url
                 : '';

    // Dùng data attribute để tránh escape phức tạp trong onclick
    html +=
      '<div class="result-item" data-id="' + esc(videoId) + '" data-title="' + esc(title) + '" data-channel="' + esc(channel) + '">' +
        '<div class="result-thumb">' +
          (thumbUrl ? '<img src="' + thumbUrl + '" alt="" loading="lazy">' : '') +
          '<div class="play-badge">&#9654;</div>' +
        '</div>' +
        '<div class="result-info">' +
          '<div class="result-title">' + escHtml(title) + '</div>' +
          '<div class="result-channel">' + escHtml(channel) + '</div>' +
        '</div>' +
      '</div>';
  }

  resultsDiv.innerHTML = html;

  // Gắn event sau khi render (tránh inline onclick với chuỗi phức tạp)
  var items2 = resultsDiv.querySelectorAll('.result-item');
  for (var j = 0; j < items2.length; j++) {
    items2[j].addEventListener('click', onResultClick);
  }
}

function onResultClick(e) {
  var el = e.currentTarget;
  playVideo(
    el.getAttribute('data-id'),
    el.getAttribute('data-title'),
    el.getAttribute('data-channel')
  );
}

// ============================================================
//  PHÁT VIDEO — điều hướng sang player.html (trang riêng biệt)
//
//  Lý do dùng trang riêng: iframe trong SPA bị ảnh hưởng bởi CSS parent
//  và không có full viewport. player.html có viewport sạch, không có CSS
//  nào gây nhiễu, YouTube player hoạt động đúng kích thước.
// ============================================================
function playVideo(videoId, title, channel) {
  window.location.href = 'player.html'
    + '#v=' + encodeURIComponent(videoId)
    + '&t=' + encodeURIComponent(title)
    + '&c=' + encodeURIComponent(channel);
}

// ============================================================
//  TRẠNG THÁI UI
// ============================================================
function showLoading() {
  resultsDiv.innerHTML =
    '<div class="loading">' +
      '<div class="loading-dots">' +
        '<div class="dot"></div>' +
        '<div class="dot"></div>' +
        '<div class="dot"></div>' +
      '</div>' +
    '</div>';
}

function showError(msg) {
  resultsDiv.innerHTML =
    '<div class="error-msg">&#9888; ' + escHtml(msg) + '</div>';
}

// ============================================================
//  HELPERS — escape để tránh XSS
// ============================================================
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function esc(str) {
  // Dùng cho data attribute (đã bọc trong dấu nháy đôi)
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}
