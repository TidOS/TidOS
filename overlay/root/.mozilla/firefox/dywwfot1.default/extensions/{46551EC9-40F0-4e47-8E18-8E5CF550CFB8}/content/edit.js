Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

var saved = false;
var style = null;
var strings = null;
var codeE, nameE, tagsE, updateUrlE;
var setCode, getCode;
var triggeringDocument = null;
var installPingURL = null;
//because some editors can have different CRLF settings than what we've saved as, we'll only save if the code in the editor has changed. this will prevent update notifications when there are none
var initialCode;

const CSSXULNS = "@namespace url(http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul);";
const CSSHTMLNS = "@namespace url(http://www.w3.org/1999/xhtml);";

function init() {

	nameE = document.getElementById("name");
	tagsE = document.getElementById("tags");
	updateUrlE = document.getElementById("update-url")
	strings = document.getElementById("strings");

	if (typeof DiavoloTokenizer == "undefined") {
		//internal editor
		codeE = document.getElementById("internal-code");
		setCode = function(code) {
			codeE.value = code;
		}
		getCode = function() {
			return codeE.value;
		}
		//wrap?
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		prefs = prefs.getBranch("extensions.stylish.");
		var wrapLines = prefs.getBoolPref("wrap_lines");
		refreshWordWrap(wrapLines);
		var wrapLinesE = document.getElementById("wrap-lines");
		wrapLinesE.checked = wrapLines;
		wrapLinesE.style.display = "";
	} else {
		//diavolo
		codeE = document.getElementById("diavolo-code");
		setCode = function(code) {
			codeE.textContent = code;
		}
		getCode = function() {
			return codeE.textContent;
		}
		codeE.init();
		codeE.parentNode.selectedIndex = 1;
		// suck in it's all text changes
		document.getElementById("internal-code").__defineSetter__("value", setCode);
		document.getElementById("internal-code").__defineGetter__("value", getCode);
	}

	var service = Components.classes["@userstyles.org/style;1"].getService(Components.interfaces.stylishStyle);
	if (window.arguments) {
		if ("id" in window.arguments[0]) {
			style = service.find(window.arguments[0].id, service.CALCULATE_META | service.REGISTER_STYLE_ON_CHANGE);
		} else if ("style" in window.arguments[0]) {
			style = window.arguments[0].style;
			style.mode = service.CALCULATE_META | service.REGISTER_STYLE_ON_CHANGE;
		}
		triggeringDocument = window.arguments[0].triggeringDocument;
		installPingURL = window.arguments[0].installPingURL;
		document.documentElement.setAttribute("windowtype", window.arguments[0].windowType);
	}

	if (style) {
		nameE.value = style.name;
		tagsE.value = style.getMeta("tag", {}).join(" ");
		updateUrlE.value = style.updateUrl;
		setCode(style.code);
		// if the style already has an id, it's been previously saved, so this is an edit
		// if the style has no id but has a url, it's an install
		document.documentElement.getButton("extra1").hidden = style.id || !style.url;
		if (style.id) {
			document.title = strings.getFormattedString("editstyletitle", [style.name]);
		} else {
			document.title = strings.getString("newstyletitle");
		}
	} else {
		style = Components.classes["@userstyles.org/style;1"].createInstance(Components.interfaces.stylishStyle);
		document.documentElement.getButton("extra1").hidden = true;
		document.title = strings.getString("newstyletitle");
	}

	// the code returned is different for some reason a little later...
	setTimeout(function(){initialCode = getCode()},100);
}

function switchToInstall() {
	Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch).setBoolPref("extensions.stylish.editOnInstall", false);
	style.name = nameE.value;
	if (getCode() != initialCode) {
		style.code = getCode();
	}
	stylishCommon.openInstall({style: style, triggeringDocument: triggeringDocument, installPingURL: installPingURL});
	window.close();
}

function save() {
	style.name = nameE.value;
	if (!style.name) {
		alert(strings.getString("missingname"));
		return false;
	}
	var code = getCode();
	if (!code) {
		alert(strings.getString("missingcode"));
		return false;
	}

	if (!style.id)
		// new styles start out enabled
		style.enabled = true;
	else if (!style.enabled)
		// turn off preview for previously saved disabled styles to avoid flicker
		style.setPreview(false);

	if (code != initialCode) {
		style.code = code;
	}

	style.removeAllMeta("tag")
	stylishCommon.cleanTags(tagsE.value).forEach(function(v) {
		style.addMeta("tag", v);
	});
	style.updateUrl = updateUrlE.value;
	style.save();
	saved = true;
	if (triggeringDocument) {
		stylishCommon.dispatchEvent(triggeringDocument, "styleInstalled");
	}
	if (installPingURL) {
		var req = new XMLHttpRequest();
		req.open("GET", installPingURL, true);
		stylishCommon.fixXHR(req);
		req.send(null);
	}
	return true;
}

function preview() {
	style.name = nameE.value;
	if (getCode() != initialCode) {
		style.code = getCode();
		// once the user has changed once, they've committed to changing so we'll forget the initial
		initialCode = null;
	}
	checkForErrors();
	style.setPreview(true);
}

function cancelDialog() {
	return true;
}

//turn off preview!
function dialogClosing() {
	style.setPreview(false);
	if (!saved) {
		style.revert();
	}
}


function checkForErrors() {
	var service = Components.classes["@userstyles.org/style;1"].getService(Components.interfaces.stylishStyle);
	var errors = document.getElementById("errors");
	errors.style.display = "none";
	while (errors.hasChildNodes()) {
		errors.removeChild(errors.lastChild);
	}
	var errorListener = {
		QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIConsoleListener, Components.interfaces.nsISupports]),
		observe: function(message) {
			errors.style.display = "-moz-box";
			var label = document.createElementNS(stylishCommon.XULNS, "label");
			var error = message.QueryInterface(Components.interfaces.nsIScriptError);

			label.appendChild(document.createTextNode(error.lineNumber + ":" + error.columnNumber + " " + error.errorMessage));
			errors.appendChild(label);
		}
	}
	style.checkForErrors(getCode(), errorListener);
}

//Insert the snippet at the start of the code textbox or highlight it if it's already in there
function insertCodeAtStart(snippet) {
	var position = getCode().indexOf(snippet);
	if (position == -1) {
		//insert the code
		//put some line breaks in if there's already code there
		if (getCode().length > 0) {
			setCode(snippet + "\n" + getCode());
		} else {
			setCode(snippet + "\n");
		}
	}
	//highlight it
	codeE.setSelectionRange(snippet.length + 1, snippet.length + 1);
	codeE.focus();
}

function insertCodeAtCaret(snippet) {
	var selectionEnd = codeE.selectionStart + snippet.length;
	setCode(getCode().substring(0, codeE.selectionStart) + snippet + getCode().substring(codeE.selectionEnd, getCode().length));
	codeE.focus();
	codeE.setSelectionRange(selectionEnd, selectionEnd);
}

function changeWordWrap(on) {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
	prefs = prefs.getBranch("extensions.stylish.");
	prefs.setBoolPref("wrap_lines", on);
	refreshWordWrap(on);
}

function refreshWordWrap(on) {
	//bug 41464 (wrap doesn't work dynamically) workaround
	codeE.style.display = "none";
	codeE.setAttribute("wrap", on ? "on" : "off");
	setTimeout("codeE.style.display = '';", 10);
}

function insertChromePath() {
	var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
	var fileHandler = ios.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler);
	var chromePath = fileHandler.getURLSpecFromFile(Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("UChrm", Components.interfaces.nsIFile));
	insertCodeAtCaret(chromePath);
}

function insertDataURI() {
	const ci = Components.interfaces;
	const cc = Components.classes;
	const nsIFilePicker = ci.nsIFilePicker;
	var fp = cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, strings.getString("dataURIDialogTitle"), nsIFilePicker.modeOpen);
	if (fp.show() != nsIFilePicker.returnOK) {
		return;
	}
	var file = fp.file;
	var contentType = cc["@mozilla.org/mime;1"].getService(ci.nsIMIMEService).getTypeFromFile(file);
	var inputStream = cc["@mozilla.org/network/file-input-stream;1"].createInstance(ci.nsIFileInputStream);
	inputStream.init(file, 0x01, 0600, 0);
	var stream = cc["@mozilla.org/binaryinputstream;1"].createInstance(ci.nsIBinaryInputStream);
	stream.setInputStream(inputStream);
	var encoded = btoa(stream.readBytes(stream.available()));
	stream.close();
	inputStream.close();
	insertCodeAtCaret("data:" + contentType + ";base64," + encoded);
}

var finder = {
	QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsITypeAheadFind, Components.interfaces.nsISupports]),
	nsITAF: Components.interfaces.nsITypeAheadFind,

	init: function(docshell) {},

	find: function(s, linksOnly) {
		this.searchString = s;
		return this.findFromIndex(0, false);
	},

	findAgain: function(backwards, linksOnly) {
		return this.findFromIndex(codeE.selectionStart + (backwards ? 0 : 1), backwards);
	},

	findFromIndex: function(index, backwards) {
		var start = backwards ? codeE.value.substring(0, index).lastIndexOf(this.searchString) : codeE.value.indexOf(this.searchString, index);
		var result;
		if (start >= 0) {
			result = this.nsITAF.FIND_FOUND;
		} else if (index == 0) {
			result = this.nsITAF.FIND_NOTFOUND;
		} else {
			// try again, start from the start
			start = backwards ? codeE.value.lastIndexOf(this.searchString) : codeE.value.indexOf(this.searchString);
			result = start == -1 ? this.nsITAF.FIND_NOTFOUND : this.nsITAF.FIND_WRAPPED;
		}
		codeE.editor.selection.removeAllRanges();
		if (start >= 0) {
			codeE.setSelectionRange(start, start + this.searchString.length);
			codeE.editor.selectionController.setDisplaySelection(2);
			codeE.editor.selectionController.scrollSelectionIntoView(1, 0, false);
		} else
			codeE.setSelectionRange(0, 0);
		return result;
	},

	setDocShell: function(docshell) {},
	setSelectionModeAndRepaint: function(toggle) {},
	collapseSelection: function(toggle) {},

	searchString: null,
	caseSensitive: false,
	foundLink: null,
	foundEditable: null,
	currentWindow: null
}
window.addEventListener("load", function() {
	var findBar = document.getElementById("findbar");
	document.getElementById("internal-code").fastFind = finder;
	findBar.open();
}, false);
