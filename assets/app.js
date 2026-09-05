/* ==========================================================================
 *  我的读书库 · 交互
 *  纯静态，无依赖。数据来自 data/books.js 里的 window.BOOKS
 * ========================================================================== */
(function () {
  "use strict";

  var BOOKS = (window.BOOKS || []).slice();
  var STATUS_LABEL = { wish: "想读", reading: "在读", done: "已读" };
  var ORDER = { reading: 0, wish: 1, done: 2 };

  /* 自动生成书封用的配色 */
  var PALETTE = [
    ["#3d6b58", "#1f3a30"], ["#8a5a3b", "#4a2f1c"], ["#3f5b7d", "#22354d"],
    ["#7a4b5e", "#43273a"], ["#6a6a3f", "#3b3b22"], ["#4a4a6b", "#262640"],
    ["#8c5a4a", "#4c2b20"], ["#2f6b6b", "#173a3a"], ["#6b5a8c", "#382e52"],
    ["#7d6a3f", "#463a1f"]
  ];

  var $ = function (s, r) { return (r || document).querySelector(s); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function hash(s) {
    var h = 0, str = String(s || "");
    for (var i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; }
    return h;
  }

  function gradient(b) {
    var p = PALETTE[hash(b.id || b.title) % PALETTE.length];
    return "linear-gradient(150deg," + p[0] + " 0%," + p[1] + " 100%)";
  }

  /* 封面：有图用图，无图或加载失败则生成书封 */
  function coverHTML(b, cls) {
    var inner = '<div class="ph" style="background:' + gradient(b) + '">' +
      '<div class="ph-title">' + esc(b.title) + "</div>" +
      '<div class="ph-author">' + esc(b.author || "") + "</div></div>";
    if (b.cover) {
      return inner + '<img src="' + esc(b.cover) + '" alt="' + esc(b.title) + '" loading="lazy" ' +
        'onerror="this.style.display=\'none\'">';
    }
    return inner;
  }

  function stars(n) {
    if (!n) return "";
    var s = "";
    for (var i = 1; i <= 5; i++) s += i <= n ? "★" : '<span class="off">★</span>';
    return '<span class="stars">' + s + "</span>";
  }

  /* ------------------------------------------------------------ 统计 -- */
  function renderStats() {
    var total = BOOKS.length;
    var done = BOOKS.filter(function (b) { return b.status === "done"; }).length;
    var reading = BOOKS.filter(function (b) { return b.status === "reading"; }).length;
    var notes = BOOKS.filter(function (b) {
      return (b.notes && String(b.notes).trim()) || (b.quotes && b.quotes.length);
    }).length;
    var data = [
      [total, "藏书"],
      [reading, "在读"],
      [done, "已读"],
      [notes, "有笔记"]
    ];
    $("#stats").innerHTML = data.map(function (d) {
      return '<div class="stat"><div class="num">' + d[0] + '</div><div class="lbl">' + d[1] + "</div></div>";
    }).join("");
  }

  /* ------------------------------------------------------ 筛选 / 排序 -- */
  var state = { q: "", status: "all", cat: "all", sort: "recent" };

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var out = BOOKS.filter(function (b) {
      if (state.status !== "all" && b.status !== state.status) return false;
      if (state.cat !== "all" && b.category !== state.cat) return false;
      if (!q) return true;
      var hay = [b.title, b.author, b.category, b.publisher, b.summary, (b.tags || []).join(" ")]
        .join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });

    var by = {
      recent: function (a, b) {
        return (b.finishedAt || b.startedAt || "").localeCompare(a.finishedAt || a.startedAt || "");
      },
      title: function (a, b) { return a.title.localeCompare(b.title, "zh-Hans-CN"); },
      rating: function (a, b) { return (b.rating || 0) - (a.rating || 0); },
      progress: function (a, b) { return (b.progress || 0) - (a.progress || 0); }
    };
    return out.sort(by[state.sort] || by.recent);
  }

  /* ------------------------------------------------------------ 渲染 -- */
  function render() {
    var list = filtered();
    var grid = $("#grid");

    if (!list.length) {
      grid.innerHTML = '<div class="empty"><div class="big">这里还空着</div>' +
        "<div>换个关键词，或者往 <code>data/books.js</code> 里加本书</div></div>";
      return;
    }

    grid.innerHTML = list.map(function (b, i) {
      var p = Math.max(0, Math.min(100, Number(b.progress) || 0));
      return '<article class="card" data-id="' + esc(b.id || i) + '" style="animation-delay:' +
        Math.min(i * 22, 400) + 'ms">' +
        '<div class="cover">' + coverHTML(b) +
          (b.status !== "done" ? '<span class="badge ' + esc(b.status) + '">' +
            STATUS_LABEL[b.status] + "</span>" : "") +
        "</div>" +
        '<div class="meta">' +
          '<div class="title">' + esc(b.title) + "</div>" +
          '<div class="author">' + esc(b.author || "") + "</div>" +
          '<div class="row">' + stars(b.rating) +
            (b.category ? '<span class="bar-txt" style="margin:0">' + esc(b.category) + "</span>" : "") +
          "</div>" +
          (b.status === "reading"
            ? '<div class="bar"><i style="width:' + p + '%"></i></div>' +
              '<div class="bar-txt">' + p + "%</div>"
            : "") +
        "</div></article>";
    }).join("");
  }

  /* ------------------------------------------------------------ 抽屉 -- */
  function openDrawer(id) {
    var b = BOOKS.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!b) return;
    var p = Math.max(0, Math.min(100, Number(b.progress) || 0));
    var kv = [
      ["作者", b.author],
      ["译者", b.translator],
      ["出版", [b.publisher, b.year].filter(Boolean).join(" · ")],
      ["分类", b.category],
      ["起读", b.startedAt],
      ["读完", b.finishedAt]
    ].filter(function (r) { return r[1]; });

    var html =
      '<button class="close" aria-label="关闭">&times;</button>' +
      '<div class="d-head"><div class="d-cover">' + coverHTML(b) + "</div><div>" +
        '<h2 class="d-title">' + esc(b.title) + "</h2>" +
        '<div class="d-sub">' + esc(b.author || "") +
          (b.rating ? " &nbsp;" + stars(b.rating) : "") + "</div>" +
        '<div><span class="tag">' + STATUS_LABEL[b.status] + "</span>" +
          (b.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") +
        "</div>" +
      "</div></div>" +

      (b.status === "reading"
        ? '<div class="d-section"><h4>进度</h4><div class="bar"><i style="width:' + p + '%"></i></div>' +
          '<div class="bar-txt">' + p + "%</div></div>"
        : "") +

      (b.summary ? '<div class="d-section"><h4>简介</h4><p>' + esc(b.summary) + "</p></div>" : "") +

      (kv.length
        ? '<div class="d-section"><h4>信息</h4><dl class="kv">' +
          kv.map(function (r) {
            return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>";
          }).join("") + "</dl></div>"
        : "") +

      (b.quotes && b.quotes.length
        ? '<div class="d-section"><h4>摘句</h4>' +
          b.quotes.map(function (q) { return '<div class="quote">' + esc(q) + "</div>"; }).join("") +
          "</div>"
        : "") +

      (b.notes
        ? '<div class="d-section"><h4>笔记</h4><div class="notes">' + esc(b.notes) + "</div></div>"
        : "") +

      (b.link ? '<a class="d-link" href="' + esc(b.link) + '" target="_blank" rel="noopener">查看原书 &rarr;</a>' : "");

    var d = $("#drawer");
    d.innerHTML = html;
    d.scrollTop = 0;
    d.classList.add("open");
    $("#scrim").classList.add("show");
    document.body.style.overflow = "hidden";
    history.replaceState(null, "", "#" + encodeURIComponent(b.id));
    $(".close", d).onclick = closeDrawer;
  }

  function closeDrawer() {
    $("#drawer").classList.remove("open");
    $("#scrim").classList.remove("show");
    document.body.style.overflow = "";
    history.replaceState(null, "", location.pathname + location.search);
  }

  /* ------------------------------------------------------------ 主题 -- */
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("rl-theme", t); } catch (e) {}
    $("#themeBtn").innerHTML = t === "dark"
      ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>';
  }

  /* ------------------------------------------------------------ 启动 -- */
  function init() {
    var saved = null;
    try { saved = localStorage.getItem("rl-theme"); } catch (e) {}
    setTheme(saved || (window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

    $("#themeBtn").onclick = function () {
      setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
    };

    /* 分类下拉 */
    var cats = [];
    BOOKS.forEach(function (b) { if (b.category && cats.indexOf(b.category) < 0) cats.push(b.category); });
    $("#cat").innerHTML = '<option value="all">全部分类</option>' +
      cats.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");

    var t;
    $("#q").addEventListener("input", function (e) {
      clearTimeout(t);
      var v = e.target.value;
      t = setTimeout(function () { state.q = v; render(); }, 140);
    });

    document.querySelectorAll(".chip").forEach(function (c) {
      c.onclick = function () {
        document.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("active"); });
        c.classList.add("active");
        state.status = c.dataset.status;
        render();
      };
    });

    $("#cat").onchange = function () { state.cat = this.value; render(); };
    $("#sort").onchange = function () { state.sort = this.value; render(); };

    $("#grid").addEventListener("click", function (e) {
      var card = e.target.closest(".card");
      if (card) openDrawer(card.dataset.id);
    });

    $("#scrim").onclick = closeDrawer;
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDrawer();
    });

    renderStats();
    render();

    /* 支持 #书id 直接打开详情 */
    if (location.hash.length > 1) {
      try { openDrawer(decodeURIComponent(location.hash.slice(1))); } catch (e) {}
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
