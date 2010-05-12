// ==UserScript==
// @name           4chan X
// @namespace      aeosynth
// @include        http://sys.4chan.org/*
// @include        http://boards.4chan.org/*
// @description    Lightweight, featureful alternative to the 4chan extension / fychan
// @version        0.24.0
// @copyright      2009, James Campos
// @license        GPL version 3 or any later version; http://www.gnu.org/copyleft/gpl.html
// @compatibility  Firefox 3.5+, Opera 10+, Chrome 4+
// ==/UserScript==

//start preferences
var forcedAnon = false;
var reportButton = false;
var quickPost = false;
var quickReply = true;
var showStubs = true;
var postExpansion = true;
var postNavigating = true;
var threadWatcher = true;
var threadHiding = true;
var threadExpansion = true;
var threadNavigating = true;
var showUpdater = true;
var autoStartUpdater = false;//Chrome users - don't turn this on; it will cause the updater to hang.
var updateFavicon = true;
var interval = 30;//seconds
//end preferences

//TODO
// whitespace, forEach, one single nodeInserted callback, chrome quick reply, scroll
// tw - bold when threads watched
// tw - manual label
// tw - show new posts / death
// tw - respawn/refresh
// try objects for movement, watched threads
// 'restart updating' button
// update now'
// qr restore
// update notification don't reset if page is too small to scroll
// only show 'new posts' if filter didn't hide them
// quick spoiler

(function() {// <-- Opera wrapper

if ((typeof GM_getValue == 'undefined') || (GM_getValue('a', 'b') == undefined)) {//chrome compat
  GM_addStyle = function(css) {
    var style = document.createElement('style');
    style.textContent = css;
    document.getElementsByTagName('head')[0].appendChild(style);
  }

  GM_deleteValue = function(name) {
    localStorage.removeItem(name);
  }

  GM_getValue = function(name, defaultValue) {
    var value = localStorage.getItem(name);
    if (!value)
      return defaultValue;
    var type = value[0];
    value = value.substring(1);
    switch (type) {
      case 'b':
        return value == 'true';
      case 'n':
        return Number(value);
      default:
        return value;
    }
  }

  GM_log = function(message) {
    console.log(message);
  }

   GM_registerMenuCommand = function(name, funk) {
  //todo
  }

  GM_setValue = function(name, value) {
    value = (typeof value)[0] + value;
    localStorage.setItem(name, value);
  }
}

//XXX possible race condition
if (/sys/.test(window.location.hostname)) {//quick reply error checking
  var message = $('table b').firstChild.textContent;
  //god dammit moot, pick something and stick with it.
  if (/^Post successful!|uploaded!$|^Updating index...$/.test(message))
    GM_setValue('error', '');
  else
    GM_setValue('error', message);
}

const form = x('./form');
if (!form)
  return;

forcedAnon = GM_getValue('Forced Anon', forcedAnon);
reportButton = GM_getValue('Report Button', reportButton);
quickPost = GM_getValue('Quick Post', quickPost);
quickReply = GM_getValue('Quick Reply', quickReply);
showStubs = GM_getValue('Show Stubs', showStubs);
postExpansion = GM_getValue('Post Expansion', postExpansion);
postNavigating = GM_getValue('Post Navigating', postNavigating);
threadWatcher = GM_getValue('Thread Watcher', threadWatcher);
threadHiding = GM_getValue('Thread Hiding', threadHiding);
threadExpansion = GM_getValue('Thread Expansion', threadExpansion);
threadNavigating = GM_getValue('Thread Navigating', threadNavigating);
showUpdater = GM_getValue('Show Updater', showUpdater);
autoStartUpdater = GM_getValue('Auto-start Updater', autoStartUpdater);
updateFavicon = GM_getValue('Update Favicon', updateFavicon);
interval = GM_getValue('Interval', interval);

const pathname = window.location.pathname;
const board = pathname.match(/\/\w+\//)[0];
const reply = /res/.test(pathname);
const update_interval = interval * 1000;
var last_modified = new Date(document.lastModified).toUTCString();
var pendingRequest = false;
var threadHidden = GM_getValue(board + 'thread', '');
var watchedBoards = GM_getValue('watchedBoards', '');
var threadSpans = $$('span[id^=nothread]', form);
var initial_mouseX, initial_mouseY, initial_boxX, initial_boxY, el;

if (reply) {
  if (showUpdater || autoStartUpdater) {
    var replies = $$('td.reply');
    var l = replies.length;
    var lastId = l ? replies[l - 1].id : 0;
    var brClear = x('.//br[@clear]');
    var fav = $('link[rel="shortcut icon"]', $('head', document));//there's no document.head, is there?
    var favHref = fav.href;
    if (/ws.ico$/.test(favHref))
      var ws = true;
    var threadDied = false;
    document.title = '(0) ' + document.title;
    scroll();
    window.addEventListener('scroll', scroll, true);
  }
  if(showUpdater) {
    var updater = create('div#updater.reply');
    var left = GM_getValue('updater_left');
    if (left)
      updater.style.left = left;
    else
      updater.style.right = '0px';
    var top = GM_getValue('updater_top');
    if (top)
      updater.style.top = top;
    else
      updater.style.bottom = '0px';
    var updaterC = tag('div');//updaterChild. my move function requires it.
    updater.appendChild(updaterC);
    if (autoStartUpdater) {
      updaterC.textContent = 'Updater On';
      var int = setTimeout(xUpdate, update_interval);
    } else
      updaterC.textContent = 'Updater Off';
    updaterC.addEventListener('click', toggleUpdating, true);
    updaterC.addEventListener('mousedown', startMove, true);
    document.body.appendChild(updater);
  } else if (autoStartUpdater)
    int = setTimeout(xUpdate, update_interval);
} else {
  var filesizes = $$('form > span.filesize');
  if (threadNavigating)
    addThreadNav();
  if (threadHiding)
    addThreadHiding();
}

if (threadWatcher) {
  var watcher = create('div#tw.reply');
  createWatcher(watcher);
}
if (threadExpansion)
  $$('.omittedposts', form).forEach(function(omit) {
    var plus = create('a.load');
    plus.title = 'Load omitted posts';
    plus.textContent = '+';
    plus.addEventListener('click', expandThread, true);
    inBefore(omit, plus);
    inBefore(omit, text(' '));
  });
if (postExpansion)
  $$('.abbr a').forEach(function(x) {
    x.addEventListener('click', xPost, true);
  });

if (quickReply) {
  var iframe = tag('iframe');
  iframe.name = 'iframe';
  var iframeReturn = false;
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  iframe.addEventListener('load', doIframe, true);
  if (reply && quickPost)
    $('.postarea > form').target = 'iframe';
}
GM_registerMenuCommand('4chan X Options', options);
GM_addStyle (
  '.error { color: red; }' +
  '.navlinks { position: absolute; right: 5px }' +
  '.navlinks > a { text-decoration: none; font-size: 16px;}' +
  '.load { font-size: 16px; cursor: pointer; font-weight: bold }' +
  '.pointer { cursor: pointer; }' +
  '#qr { position: fixed; border: 1px ridge; color: inherit; text-align: right; }' +
  '#qr a { cursor: pointer; }' +
  '#qr > span { position: absolute; bottom: 0; left: 0; }' +
  '#options { position: fixed; border: 1px ridge; color: inherit; text-align: right; }' +
  '#options a,' +
  '#options label { cursor: pointer; }' +
  '#options div:first-child { cursor: move; padding: 5px 0 0 0; text-align: center; text-decoration: underline; }' +
  '#tw { position: absolute; border: 1px ridge; color: inherit; }' +
  '#tw a { cursor: pointer; }' +
  '#tw div:first-child { text-decoration: underline; }' +
  '#tw div:first-child { cursor: move; padding: 5px 5px 0 5px; }' +
  '#tw div:last-child,' +
  '#options div:last-child { padding: 0 5px 5px 5px; }' +
  '#updater { position:fixed; border: 1px solid; cursor:pointer; padding:10px; color:inherit; }' +
  '#updater:active { cursor:move; }'
);

init(form);
form.addEventListener('DOMNodeInserted',
  function(e) {
    var target = e.target;
    if (target.nodeName == 'TABLE')
      init(target);
  },
  true);

function init(target) {
  if (forcedAnon)
    anonymize(target);
  if (postNavigating)
    addThreadStartButton(target);
  if (reportButton)
    addReportButton(target);
  if (quickReply)
    addQR(target);
}

function anonymize(root) {
  $$('.commentpostername, .postername', root).forEach(function(name) {
    name.innerHTML = 'Anonymous';
  });
  $$('.postertrip', root).forEach(function(trip) {
    if (trip.parentNode.nodeName == "A")
      remove(trip.parentNode);
    else
      remove(trip);
  })
}

function addThreadNav() {
  var pageNum = Number(pathname.match(/\d+$/));
  for (var i = 0, l = filesizes.length; i < l; i++) {
    var nav = create('span.navlinks');
    var top = tag('a');
    top.name = i;
    top.href = i ? '#' + (i - 1)
      : pageNum > 1 ? board + (pageNum - 1)
      : pageNum == 1 ? board//there's no board0 page
      : '#navtop';
    top.textContent = (i || pageNum == 0) ? '▲' : '◀';
    var bot = tag('a');
    if (i == l - 1) {
      bot.href = board + (pageNum + 1);
      bot.textContent = '▶';
    } else {
      bot.href = '#' + (i + 1);
      bot.textContent = '▼';
    }
    nav.appendChild(top);
    nav.appendChild(text(' '));
    nav.appendChild(bot);
    inBefore(filesizes[i], nav);
  }
}

function addThreadHiding() {
  filesizes.forEach(function(item) {
    var div = tag('div');
    div.id = x('./span[starts-with(@id, "nothread")]', form).id;
    div.innerHTML = '<a class="pointer" title="Hide Thread">[ - ]</a> ';
    div.firstChild.addEventListener('click', hideThread, true);
    inBefore(item, div);
    while (!item.clear) {//<br clear="left"/>
      div.appendChild(item);
      item = div.nextSibling;
    }
    if (threadHidden.indexOf(div.id) != -1)
      hideThread(div);
  });
}

function hideThread(div) {
  if (this.nodeName) {
    div = this.parentNode;
    threadHidden += div.id + '\n';
    GM_setValue(board + 'thread', threadHidden);
  }
  div.style.display = 'none';

  var a = create('a.pointer');
  a.textContent = '[ + ]';
  a.title = 'Show Thread';
  a.addEventListener('click', showThread, true);
  var span = tag('span');
  span.appendChild(a);
  span.appendChild(text(' '));
  var omitted = $('span.omittedposts', div);
  var count = create('span.omittedposts');
  count.textContent = omitted ?
    parseInt(omitted.textContent) + 6://omitted + OP + 5 last posts
    $$('blockquote', div).length;
  span.appendChild(count);
  span.appendChild(text(' '));
  span.appendChild(
    $('.filetitle', div).cloneNode(true)
  );
  span.appendChild(text(' '));
  span.appendChild(text(
    $('blockquote', div).textContent.slice(0, 25)
  ));
  if (!showStubs) {
    div.nextSibling.style.display = 'none';
    div.nextSibling.nextSibling.style.display = 'none';
    var prev = div.previousSibling;
    if (prev.nodeName == 'SPAN')//Thread nav
      prev.style.display = 'none';
    span.style.display = 'none';
  }
  inBefore(div, span);
}

function showThread() {
  var div = this.parentNode.nextSibling;
  div.style.display = '';
  threadHidden = threadHidden.replace(div.id + '\n', '');
  GM_setValue(board + 'thread', threadHidden);
  remove (this.parentNode);
}

function createWatcher(watcher) {//todo - split this up
  watcher.innerHTML =
    '<div>' +
      'Watched Threads' +
    '</div>' +
    '<div>' +
    '</div>';
  watcher.style.display = GM_getValue('watcherDisplay', '');
  var top = GM_getValue('tw_top', '0px');
  if (top)
    watcher.style.top = top;
  else
    watcher.style.bottom = '0px';
  var left = GM_getValue('tw_left', '0px');
  if (left)
    watcher.style.left = left;
  else
    watcher.style.right = '0px';
  watcher.firstChild.addEventListener('mousedown', startMove, true);

  var tw = create('a.pointer');
  tw.textContent = 'TW';
  tw.addEventListener('click', twF, true);
  var navtop = $('#navtop');
  inBefore(navtop.lastChild, text(' / '));
  inBefore(navtop.lastChild, tw);

  var re = /(.+)\n(.+)/g;
  var tempArray;
  var matches = watchedBoards.match(/\/\w+\//g);
  if (matches) {
    matches.forEach(function(match) {
      var tempWatched = GM_getValue(match + 'watched', '');
      while (tempArray = re.exec(tempWatched))
        addToWatcher(tempArray[1], tempArray[2]);
    });
  }
  document.body.appendChild(watcher);

  var watched = GM_getValue (board + 'watched', '');
  $$('span[id^=nothread]', form).forEach(function(span) {
    var watch = create('a.pointer');
    watch.textContent = watched.indexOf(span.id.match(/\d+/)[0]) > -1 ? 'Unwatch' : 'Watch';
    watch.addEventListener('click', watchThread, true);
    inAfter(span, watch);
    inAfter(span, text(' '));
  });
}

function twF() {
  var watcherDisplay = watcher.style.display ? '' : 'none';
  GM_setValue ('watcherDisplay', watcherDisplay);
  watcher.style.display = watcherDisplay;
}

function watchThread() {
  if (reply)
    var url = window.location.href.match(/[^#]+/)[0];
  else
    url = x("preceding-sibling::span[1]/a[3]", this).href;
  if (this.textContent == 'Watch') {
    watch(url, this);
    this.textContent = 'Unwatch';
  } else {
    unwatch(url);
    this.textContent = 'Watch';
  }
}

function watchX() {
  var url = this.nextSibling.nextSibling.href;
  unwatch(url);
  var tempBoard = url.match(/\/\w+\//)[0];
  if (tempBoard == board) {//if unwatch button is on page, change its text
    var watch = $('span#nothread' + url.match(/\/(\d+)/)[1] + ' + a', form);
    if (watch)
      watch.textContent = 'Watch';
  }
}

function addToWatcher(url, txt) {
  var x = tag('a');
  x.textContent = 'X';
  x.addEventListener('click', watchX, true);
  var a = tag('a');
  a.href = url;
  a.textContent = txt;
  var span = tag('span');
  span.appendChild(x);
  span.appendChild(text(' '));
  span.appendChild(a);
  span.appendChild(tag('br'));
  watcher.lastChild.appendChild(span);
}

function unwatch(url) {
  var tempBoard = url.match(/\/\w+\//)[0];
  var tempWatched = GM_getValue(tempBoard + 'watched', '');
  var re = new RegExp(url + '\n.+\n\n');
  tempWatched = tempWatched.replace(re, '');
  if (tempWatched)
    GM_setValue(tempBoard + 'watched', tempWatched);
  else {
    GM_deleteValue (tempBoard + 'watched');
    watchedBoards = watchedBoards.replace (tempBoard, '');
    GM_setValue ('watchedBoards', watchedBoards);
  }
  $$('a', watcher).forEach(function(el){
    if (el.href == url)
      remove(el.parentNode)
  });
}

function watch(url, node) {
  var txt = x('preceding-sibling::span[@class="filetitle"]', node).textContent//First look for subject
  if (!txt) {//then OP's text
    txt = x('following-sibling::blockquote', node).textContent;
    if (txt)
      txt = txt.slice(0,25);
    else {// finally OP's name/trip
      txt = x('preceding-sibling::span[@class="postername"]', node).textContent;
      var temp = x('preceding-sibling::span[@class="postertrip"]', node);
      if (temp)
        txt += temp.textContent;
    }
  }
  addToWatcher(url, txt);
  var watched = GM_getValue (board + 'watched', '');
  watched += url + '\n' + txt + '\n\n';
  GM_setValue(board + 'watched', watched);
  if (watchedBoards.indexOf(board) == -1)
    GM_setValue('watchedBoards', watchedBoards + board);
}

function expandThread() {
  var text = this.nextSibling;
  if (this.textContent == 'x') {
    text.textContent = ' ';
    this.textContent = '+';
    return this.title = 'Expand Thread';
  }
  var omitted = text.nextSibling;
  var l = parseInt(omitted.textContent);//XXX what about deleted posts? YOU SHUT YOUR WHORE MOUTH
  if (this.textContent == '-') {
    for (var i = 0; i < l; i++)
      remove (omitted.nextElementSibling);
    this.textContent = '+';
    return this.title = 'Expand Thread';
  }
  text.textContent = ' Loading... ';
  this.textContent = 'x';
  this.title = 'Cancel Expansion';
  var url = x("preceding-sibling::span[starts-with(@id, 'nothread')]/a[contains(text(), 'Reply')]", this).href;
  xThread(text, url);
}

function xThread(text, url) {
  var r = new XMLHttpRequest();
  r.onreadystatechange = function() {
    if (this.readyState == 4 && text.textContent == ' Loading... ') {
      if (this.status == 200) {
        var body = tag('body');
        body.innerHTML = this.responseText;
        var tables = X('.//td[@id]/ancestor::table', body);
        text.textContent = ' ';
        text.previousSibling.textContent = '-';
        text.previousSibling.title = 'Contract Thread';
        const first = x("following-sibling::a", text);
        var l = parseInt(text.nextSibling.textContent);
        for (var i = 0; i < l; i++)
          inBefore(first, tables[i]);
      } else {
        text.textContent = ' ' + this.status + ' ' + this.statusText + ' ';
        text.previousSibling.textContent = '+';
        text.previousSibling.title = 'Expand Thread';
      }
    }
  }
  r.open('GET', url, true);
  r.send(null);
}

function addThreadStartButton(root) {
  $$('[id^=norep]', root).forEach(function(el) {
    var bottom = create('a.pointer');
    bottom.textContent = '▼';
    bottom.addEventListener('click',
      function() {
        var temp = x("following::span[starts-with(@id, 'nothread')][1]", this);
        window.location = '#' + (temp ? temp.id : 'navbot');
      },
      true);
    inAfter(el, bottom);
    inAfter(el, text(' '));

    var top = create('a.pointer');
    top.textContent = '▲';
    top.addEventListener('click',
      function() { window.location = '#' + x("preceding::span[starts-with(@id, 'nothread')][1]", this).id },
      true);
    inAfter(el, top);
    inAfter(el, text(' '));
  });
}

function addReportButton(root) {
  $$('span[id^=no]', root).forEach(function(span) {
    var report = create('a.pointer');
    report.textContent = '[ ! ]';
    report.addEventListener('click', reportF, true);
    inAfter(span, report);
    inAfter(span, text(' '));
  });
}

function reportF() {
  x('preceding-sibling::input', this).click();
  $('.deletebuttons input[type=button]').click();
}

function xPost(e) {
  e.preventDefault();
  var el = this.parentNode;
  el.textContent = 'Loading...';
  var url = this.href;

  var r = new XMLHttpRequest();
  r.onreadystatechange = function() {
    if (this.readyState == 4){
      if(this.status == 200) {
        var id = url.match(/\d+$/)[0];
        var body = tag('body');
        body.innerHTML = this.responseText;
        el.parentNode.innerHTML = x('.//a[@name=' + id + ']/following::blockquote', body).innerHTML;
      } else
        el.textContent = this.status + ' ' + this.statusText;
    }
  }
  r.open('GET', url, true);
  r.send(null);
}

function doIframe() {
  if (iframeReturn = !iframeReturn)
    return;//stop infinite loop when loading about:blank
  var qr = $('#qr');
  if (qr) {
    var error = GM_getValue('error', '');
    if (error) {
      qr.lastChild.style.visibility = '';
      var span = create('span.error');
      span.textContent = error;
      qr.appendChild(span);
    } else
      remove (qr);
  }
  iframe.src = 'about:blank';
}

function addQR(root) {
  $$('span[id^=no] > a:nth-child(2)', root).forEach(function(quotelink) {
    quotelink.addEventListener('click', qr, true);
  });
}

function qr (e) {//this could also be wrapped up in an object
  e.preventDefault();
  var qr = $('#qr');
  if (!qr) {
    qr = create('div#qr.reply');
    var top = GM_getValue('qr_top', '0px');
    if (top)
      qr.style.top = top;
    else
      qr.style.bottom = '0px';
    var left = GM_getValue('qr_left', '0px')
    if (left)
      qr.style.left = left;
    else
      qr.style.right = '0px';
    qr.innerHTML =
      '<div style="cursor: move">' +
      'Quick Reply ' +
      '</div>';
    qr.firstChild.addEventListener('mousedown', startMove, true)
    var qr_shade = tag('a');
    qr_shade.textContent = '_';
    qr_shade.addEventListener('click', function() {
      var qr_form = this.parentNode.nextSibling;
      qr_form.style.visibility = qr_form.style.visibility ? '' : 'collapse';
      },
      true);
    var qr_close = tag('a');
    qr_close.textContent = 'X';
    qr_close.addEventListener('click', function() {remove(qr)}, true);
    qr.firstChild.appendChild(qr_shade);
    qr.firstChild.appendChild(text(' '));
    qr.firstChild.appendChild(qr_close);

    var qr_form = $('.postarea > form').cloneNode(true);
    remove ($('tr:last-child', qr_form));
    qr_form.target = 'iframe';
    if (!reply) {
      var input = tag('input');
      input.name = 'resto';
      input.type = 'hidden';
      var id = this.parentNode.id;
      if (!/thread/.test(id))
        id = x('preceding::span[starts-with(@id, "nothread")][1]', this).id;
      input.value = id.match(/\d+$/)[0];
      qr_form.appendChild(input);
    }
    qr_form.addEventListener('submit',
      function() {
        this.style.visibility = 'collapse';
        var span = this.nextSibling;
        if (span)
          remove(span);
      }, true);
    qr.appendChild (qr_form);
    document.body.appendChild(qr);
  }
  var textArea = $('textArea', qr);
  var selection = window.getSelection();
  var selAnchor = selection.anchorNode;
  if (selAnchor && selAnchor.parentNode.parentNode == this.parentNode.parentNode)
    var selText = selection.toString();
  textArea.value += '>>' + this.textContent.match(/\d+/) + '\n' + (selText ? '>' + selText + '\n' : '');
  textArea.scrollTop = textArea.scrollHeight;
  textArea.focus();
}

function favicon (state) {
  if (!updateFavicon) return;
  var newFav = fav.cloneNode(true);
  switch (state) {
    case 'new'://worksafe ? blue halo : green halo
      newFav.href = ws ?
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZklEQVR4XrWRQQoAIQwD+6L97j7Ih9WTQQxhDqJQCk4Mranuvqod6LgwawSqSuUmWSPw/UNlJlnDAmA2ARjABLYj8ZyCzJHHqOg+GdAKZmKPIQUzuYrxicHqEgHzP9g7M0+hj45sAnRWxtPj3zSPAAAAAElFTkSuQmCC'                :
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAgMAAABinRfyAAAADFBMVEUAAABmzDP///8AAABet0i+AAAAAXRSTlMAQObYZgAAAExJREFUeF4tyrENgDAMAMFXKuQswQLBG3mOlBnFS1gwDfIYLpEivvjq2MlqjmYvYg5jWEzCwtDSQlwcXKCVLrpFbvLvvSf9uZJ2HusDtJAY7Tkn1oYAAAAASUVORK5CYII=';
      break;
    case 'dead'://new posts ? red halo : red
      newFav.href = replies.length ?
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWUlEQVR4XrWSAQoAIAgD/f+njSApsTqjGoTQ5oGWPJMOOs60CzsWwIwz1I4PUIYh+WYEMGQ6I/txw91kP4oA9BdwhKp1My4xQq6e8Q9ANgDJjOErewFiNesV2uGSfGv1/HYAAAAASUVORK5CYII='    :
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAgMAAABinRfyAAAACVBMVEUAAAAAAAD/AAA9+90tAAAAAXRSTlMAQObYZgAAADtJREFUCB0FwUERxEAIALDszMG730PNSkBEBSECoU0AEPe0mly5NWprRUcDQAdn68qtkVsj3/84z++CD5u7CsnoBJoaAAAAAElFTkSuQmCC';
      threadDied = true;
      break;
    default://threadDied ? red : default
      newFav.href = threadDied ?
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAgMAAABinRfyAAAACVBMVEUAAAAAAAD/AAA9+90tAAAAAXRSTlMAQObYZgAAADtJREFUCB0FwUERxEAIALDszMG730PNSkBEBSECoU0AEPe0mly5NWprRUcDQAdn68qtkVsj3/84z++CD5u7CsnoBJoaAAAAAElFTkSuQmCC':
        favHref;
  }
  fav.parentNode.replaceChild(newFav, fav);
  fav = newFav;
}

function toggleUpdating() {
  if (this.textContent != 'Updater Off') {
    this.textContent = 'Updater Off';
    clearInterval(int);
  } else {
    this.textContent = 'Updater On';
    if (!(pendingRequest))
      int = setTimeout(xUpdate, update_interval);
  }
}

function xUpdate() {
  pendingRequest = true;
  if (updaterC)
    updaterC.textContent = 'Updating...';
  var r = new XMLHttpRequest();
  r.open ('GET', pathname);
  r.onreadystatechange = function() {
    if (this.readyState == 4) {
      switch (this.status) {// 200 = ok, 304 = not modified, other = ;_;
        case 200:
          last_modified = this.getResponseHeader('Last-Modified');
          var body = tag('body');
          body.innerHTML = this.responseText;
          var responsePosts = $$('td.reply', body);
          var td = responsePosts.pop();
          if (td && (td.id > lastId)) {
            var minId = lastId;
            lastId = td.id;
            var insertPosts = [];
            do {
              insertPosts.unshift(td);
              td = responsePosts.pop();
            } while (td && (td.id > minId));
            insertPosts.forEach(function(td) {//insert posts in order so they exist when backlinking
              var table = td.parentNode.parentNode.parentNode;
              inBefore(brClear, table);
              replies.push(td);
            });
            favicon('new');
          }
          document.title = document.title.replace(/\d+/, replies.length);
        case 304:
          if (!updaterC || updaterC.textContent != 'Updater Off')
            int = setTimeout(xUpdate, update_interval);
          break;
        default:
          try {// thread died
            document.title = '(' + replies.length + ') ' + board + ' - ' + this.status + ' ' + this.statusText;
            $$('.postarea > form input[type=submit]').forEach(function(input) {
              input.disabled = 'disabled';
            });
            favicon('dead');
          } catch (e) {// connection error
            if (!updaterC || updaterC.textContent != 'Updater Off')
              int = setTimeout(xUpdate, update_interval);
          }
      }
      pendingRequest = false;
      if (updaterC)
        updaterC.textContent = this.status + ' ' + this.statusText;
    }
  }
  r.setRequestHeader ('If-Modified-Since', last_modified);
  r.send();
}

function scroll() {
  if (!replies.length) return;
  var height = document.body.clientHeight;
  var allRead = replies.every(function(post, i) {
    if (post.getBoundingClientRect().bottom > height) {//if the post's bottom is below the screen bottom
      replies = replies.splice(i);
      return false;//the user has not read the entire post
    } else
      return true;
  });
  if (allRead) {
    replies = [];
    favicon();
  }
  document.title = document.title.replace(/\d+/, replies.length);
}

function options() {
  var div = create('div#options.reply');
  var top = GM_getValue('options_top', document.body.clientHeight / 2);
  if (top)
    div.style.top = top;
  else
    div.style.bottom = '0px';
  var left = GM_getValue('options_left', document.body.clientWidth / 2);
  if (left)
    div.style.left = left;
  else
    div.style.right = '0px';
  div.innerHTML = 
    '<div>4chan X</div>' +
    '<div>' +
    '<label>Forced Anon<input type = "checkbox"></label><br>' +
    '<label>Report Button<input type = "checkbox"></label><br>' +
    '<label>Quick Post<input type = "checkbox"></label><br>' +
    '<label>Quick Reply<input type = "checkbox" checked="true"></label><br>' +
    '<label>Show Stubs<input type = "checkbox" checked="true"></label><br>' +
    '<label>Post Expansion<input type = "checkbox" checked="true"></label><br>' +
    '<label>Post Navigating<input type = "checkbox" checked="true"></label><br>' +
    '<label>Thread Watcher<input type = "checkbox" checked="true"></label><br>' +
    '<label>Thread Hiding<input type="checkbox" checked="true"></label><br>' +
    '<label>Thread Expansion<input type = "checkbox" checked="true"></label><br>' +
    '<label>Thread Navigating<input type = "checkbox" checked="true"></label><br>' +
    '<label>Show Updater<input type = "checkbox" checked="true"></label><br>' +
    '<label>Auto-start Updater<input type = "checkbox"></label><br>' +
    '<label>Update Favicon<input type = "checkbox" checked="true"></label><br>' +
    'Interval (s)<input size = 3 maxlength = 5><br>' +
    '<input type = "button" value = "Clear Hidden"><br>' +
    '<a>save</a> <a>cancel</a>' +
    '</div>';
  div.firstChild.addEventListener('mousedown', startMove, true);
  var temp = $$('input[type=checkbox]', div);
  for (var i = 0, l = temp.length; i < l; i++)
    temp[i].checked = GM_getValue(temp[i].parentNode.textContent, temp[i].checked);
  temp = $('input[size]', div);
  temp.value = GM_getValue('Interval', 30);
  temp = $('input[type=button]', div);
  temp.addEventListener('click',
    function() {
      GM_deleteValue (board + 'thread');
      GM_deleteValue (board + 'reply');
    },
    true);
  temp = $$('a', div);
  temp[0].addEventListener('click', function() {//save
    var div = this.parentNode.parentNode;
    var temp = $$('input[type=checkbox]', div);
    for (var i = 0, l = temp.length; i < l; i++)
      GM_setValue(temp[i].parentNode.textContent, temp[i].checked);
    temp = $('input[size]', div);
    if (!temp.value.length || isNaN(temp.value) || temp.value < 0)
      temp.value = 20;
    GM_setValue('Interval', temp.value);
    remove (div);
    },
    true);
  temp[1].addEventListener('click', function() {//cancel
    var div = this.parentNode.parentNode;
    remove (div);
    },
    true);
  document.body.appendChild(div);
}

//utility
function startMove (event) {//TODO wrap this up in an object
  el = this.parentNode;
  initial_mouseX = event.clientX;
  initial_mouseY = event.clientY;
  if (el.style.right)
    initial_boxX = 0;
  else
    initial_boxX = document.body.clientWidth - el.offsetWidth - parseInt(el.style.left);
  if (el.style.bottom)
    initial_boxY = document.body.clientHeight - el.offsetHeight;
  else
    initial_boxY = parseInt(el.style.top);
  document.addEventListener('mousemove', move, true);
  document.addEventListener('mouseup', endMove, true);
}

function move (event) {
  var right = initial_boxX + initial_mouseX - event.clientX;
  var left = document.body.clientWidth - el.offsetWidth - right;
  el.style.right = '';
  if (right < 15) {
    el.style.right = 0;
    el.style.left = '';
  } else if (left < 15)
    el.style.left = 0;
  else
    el.style.left = left + 'px';
  var top = initial_boxY - initial_mouseY + event.clientY;
  var bottom = document.body.clientHeight - el.offsetHeight - top;
  el.style.bottom = '';
  if (bottom < 15) {
    el.style.bottom = 0;
    el.style.top = '';
  } else if (top < 15)
    el.style.top = 0;
  else
    el.style.top = top + 'px';
}

function endMove() {
  document.removeEventListener('mousemove', move, true);
  document.removeEventListener('mouseup', endMove, true);
  GM_setValue(el.id + '_left', el.style.left);
  GM_setValue(el.id + '_top', el.style.top);
}

function create(css) {
  var matches = css.match(/(\w+)(#\w+)?((?:\.\w+)*)/);
  var tag = matches[1];
  var id = matches[2];
  var classes = matches[3];
  var node = document.createElement(tag);
  if (id)
    node.id = id.substring(1);
  if (classes)
    node.className = classes.match(/\w+/g).join(' ');
  return node;
}

function inBefore(root, el) {
  root.parentNode.insertBefore(el, root);
}

function inAfter(root, el) {
  root.parentNode.insertBefore(el, root.nextSibling);
}

function remove(el) {
  el.parentNode.removeChild(el);
}

function tag(el) {
  return document.createElement(el);
}

function text(el) {
  return document.createTextNode(el);
}

function $(selector, root) {
  if (!root) root = document.body;
  return root.querySelector(selector);
}

function $$(selector, root) {
  if (!root) root = document.body;
  var result = root.querySelectorAll(selector);
  var a = [];
  for (var i = 0, l = result.length; i < l; i++)
    a.push(result[i]);
  return a;
}

function x(xpath, root) {
  if (!root) root = document.body;
  return document.evaluate(xpath, root, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null).singleNodeValue;
}

function X(xpath, root) {
  if (!root) root = document.body;
  var result = document.evaluate(xpath, root, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
  var a = [], item;
  while (item = result.iterateNext())
    a.push(item);
  return a;
}

})()
