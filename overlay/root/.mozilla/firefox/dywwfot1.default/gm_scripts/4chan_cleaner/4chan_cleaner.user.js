// ==UserScript==
// @name          4chan Cleaner
// @author        ankut
// @include	  http://*.4chan.org/*
// @include	  http://*.4channel.org/*
// @description	  Cleans up 4chan
// ==/UserScript==

var cleaner = {
	xpath : function(expr, ref, type) {
		ref = (ref ? ref : document);
		type = (type ? type : XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE);
		return document.evaluate(expr, ref, null, type, null);
	},

	getPage : function getPage(uri)
	{
		GM_xmlhttpRequest({
		    method: 'GET',
		    url: uri,
		    headers: {
        		'User-agent': 'Mozilla/4.0',
	        	'Accept': 'text/html',
		    },
		    onload: function(e) {
			var page = document.createElement("body");
			page.innerHTML += e.responseText.replace(/adbrite/g, "");

			var forms = page.getElementsByTagName("form");
			for (var i = 0; i < forms.length; i++)
			{
				if (forms[i].name == 'delform')
				{
					document.body.appendChild(forms[i]);
					cleaner.removeCrap();
					cleaner.formatComments();
					cleaner.openReplyNew();
					break;
				}
			}
		    }
		});
	},

	removeCrap : function()
	{
		// remove the crap from the bottom of the form after the last post
		var crap = cleaner.xpath("//form[@name='delform']/br[@clear='left'][last()]/following-sibling::* | //script[contains(@src, 'adbrite')]");
		for (i = 0; i < crap.snapshotLength; i++)
			crap.snapshotItem(i).parentNode.removeChild(crap.snapshotItem(i));
	},

	formatComments : function()
	{
		// comments
		var com = cleaner.xpath("//form[@name='delform']/table/tbody/tr/td/blockquote");
		for (i = 0; i < com.snapshotLength; i++) {
			var table = com.snapshotItem(i).parentNode.parentNode.parentNode.parentNode;
			var form = table.parentNode;
			var comment = com.snapshotItem(i);

			if (comment.previousSibling.nodeName == 'A') {
				comment.appendChild(comment.previousSibling);
			}
			form.replaceChild(comment, table);
		}
	},

	getNavLinks : function()
	{
		var links = [];

		// get the links to the next pages, if they exist
		var nav = cleaner.xpath("//form[@name='delform']/table[@align='left']/tbody/tr/td/a");
		for (i = 0; i < nav.snapshotLength; i++)
			links.push(nav.snapshotItem(i).href);
	
		return links;	
	},

	openReplyNew : function()
	{
 		var replies = cleaner.xpath("//a[text()='Reply']");
		for (var i = 0; i < replies.snapshotLength; i++)
			replies.snapshotItem(i).target = '_blank';
	},

	hideShowPost : 1,
	buildPost : function()
	{
		GM_addStyle("div.postarea { display: none !important; }");
		GM_addStyle("div.createpost { text-align: center; width: 100% }");

		var postarea = cleaner.xpath("//div[@class='postarea']").snapshotItem(0);
		var linkDiv = document.createElement("div");
		var linkPost = document.createElement("a");

		linkDiv.className = "createpost";
		linkPost.innerHTML = "New Post";
		linkPost.href = "#";
		linkPost.addEventListener("click", function(e) {
			if (cleaner.hideShowPost++ % 2)	GM_addStyle("div.postarea { display: block !important; }");
			else 				GM_addStyle("div.postarea { display: none !important; }");
		}, true);

		linkDiv.appendChild(linkPost);
		linkDiv.appendChild(postarea);		
		return linkDiv;
	},


	init : function()
	{
		// get the header
		var navtop = document.getElementById("navtop");
		if (!navtop) return;

		var post = cleaner.buildPost();

		GM_addStyle("blockquote {border-bottom: 1px dotted #BFBFBF; /*clear: both*/}");
		GM_addStyle("img {padding: 5px;}");

		var links = cleaner.getNavLinks();

		cleaner.formatComments();
		cleaner.removeCrap();

		var body = document.createElement("body");

		// put the navbar on top
		body.appendChild(navtop);
		body.appendChild(document.createElement("br"));
		body.appendChild(document.createElement("hr"));
		body.appendChild(post);

		// grab the forms only
		var forms = cleaner.xpath("//form[@name='delform']");
		for(var i = 0; i < forms.snapshotLength; i++)
			body.appendChild(forms.snapshotItem(i));

		document.firstChild.replaceChild(body, document.body);

		cleaner.openReplyNew();
		for (var i = 0; i < links.length; i++)
			cleaner.getPage(links[i]);
	}
}; 

if (document.body) cleaner.init();