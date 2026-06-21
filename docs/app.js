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
var searchInput  = document.getElementById('search-input');
var searchBtn    = document.getElementById('search-btn');
var resultsDiv   = document.getElementById('results');
var screenSearch = document.getElementById('screen-search');
var screenPlayer = document.getElementById('screen-player');
var ytPlayer     = null; // tạo động mỗi lần play
var videoInfoDiv = document.getElementById('video-info');
var apiBanner    = document.getElementById('api-banner');

// ============================================================
//  Khởi tạo
// ============================================================
(function init() {
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    apiBanner.classList.remove('hidden');
  }

  // Bắt phím Enter trên bàn phím iOS
  searchInput.addEventListener('keydown', function (e) {
    if (e.keyCode === 13) {
      searchInput.blur(); // đóng bàn phím
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
//  PHÁT VIDEO
//
//  Tạo iframe MỚI mỗi lần play — không reuse iframe cũ.
//  Lý do: YouTube player khởi tạo size khi iframe mount vào DOM.
//  Nếu reuse, size đã bị lock từ lần trước và không thay đổi được.
//
//  Thêm webkit-playsinline cho iOS 9 (cần attribute, không chỉ URL param).
// ============================================================
function playVideo(videoId, title, channel) {
  var screenW  = window.innerWidth;
  var screenH  = Math.round(screenW * 9 / 16);

  // Hiển thị info
  videoInfoDiv.innerHTML =
    '<h2>' + escHtml(title) + '</h2>' +
    '<div class="video-channel">' + escHtml(channel) + '</div>';

  // Chuyển màn hình
  screenSearch.classList.remove('active');
  screenPlayer.classList.add('active');
  window.scrollTo(0, 0);

  // Cấu hình container
  var wrap = document.querySelector('.player-wrap');
  wrap.style.width    = screenW + 'px';
  wrap.style.height   = screenH + 'px';
  wrap.style.overflow = 'hidden';

  // Tạo iframe mới với đúng kích thước từ đầu
  var iframe = document.createElement('iframe');
  iframe.setAttribute('width',               String(screenW));
  iframe.setAttribute('height',              String(screenH));
  iframe.setAttribute('frameborder',         '0');
  iframe.setAttribute('allowfullscreen',     'allowfullscreen');
  iframe.setAttribute('webkit-allowfullscreen', '');  // iOS cũ cần attribute này
  iframe.setAttribute('playsinline',         '');     // HTML attribute
  iframe.setAttribute('webkit-playsinline', '');      // iOS 9 inline video
  iframe.style.display = 'block';
  iframe.style.width   = screenW + 'px';
  iframe.style.height  = screenH + 'px';
  iframe.style.border  = 'none';

  // Xóa iframe cũ rồi gắn iframe mới
  wrap.innerHTML = '';
  wrap.appendChild(iframe);
  ytPlayer = iframe;

  // Set src SAU KHI iframe đã mount vào DOM với kích thước đúng
  iframe.src = 'https://www.youtube.com/embed/' + videoId
    + '?autoplay=1'
    + '&playsinline=1'
    + '&rel=0'
    + '&modestbranding=1';
}

// ============================================================
//  QUAY LẠI TÌM KIẾM
// ============================================================
function goBack() {
  // Xóa hẳn iframe khỏi DOM để dừng video và giải phóng bộ nhớ
  var wrap = document.querySelector('.player-wrap');
  if (wrap) wrap.innerHTML = '';
  ytPlayer = null;

  screenPlayer.classList.remove('active');
  screenSearch.classList.add('active');
  window.scrollTo(0, 0);
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
