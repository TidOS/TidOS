// ==UserScript==
// @name           4chan time
// @namespace      http://userscripts.org/users/64431
// @description    Localize and format 4chan timestamps
// @version        1.3.1
// @include        http://*.4chan.org/*
// @include        http://4chanarchive.org/brchive/*
// @include        http://suptg.thisisnotatrueending.com/archive/*
// @copyright      2009, James Campos
// @license        cc-by-3.0; http://creativecommons.org/licenses/by/3.0/
// ==/UserScript==

//PREFERENCES
const chan_offset = -1
const am_pm = true
//END PREFERENCES

const xpath = ".//span[@class='commentpostername' or @class='postername']/following-sibling::text()[string-length(.) > 1][1]"
var timeNodes = document.evaluate(xpath, document.body, null, 6, null)
for (var i = 0, l = timeNodes.snapshotLength; i < l; i++)
	retime(timeNodes.snapshotItem(i))

function retime(timeNode) {
	if (!(times = timeNode.textContent.match(/(\d+)\/(\d+)\/(\d+).([A-z]+).(\d+)(\S+)/))) return//this really shouldn't happen
	var month = Number(times[1])
	var day = Number(times[2])
	var year = Number(times[3])
	var day_of_week = times[4]
	var hour = Number(times[5]) + chan_offset
	var min_sec = times[6]
	var leap = year % 4 ? 0 : 1
	if (hour < 0) {//prev day
		hour = hour + 24
		day = day - 1
		day_of_week = yesterday()
		if (day < 1) {//prev month
			month = month - 1
			if (month < 1) {//prev year
				month = 12
				year = year - 1
			}
			day = last_day_of_month()
		}
	}
	if (hour > 23) {//next day
		hour = hour - 24
		day = day + 1
		day_of_week = tomorrow()
		if (day > last_day_of_month()) {//next month
			month = month + 1
			if (month > 12) {//next year
				month = 1
				year = year + 1
			}
			day = 1
		}
	}
	if (am_pm) {
		if (hour > 12) {
			hour = hour - 12
			min_sec = min_sec + 'PM'
		} else
			min_sec = min_sec + 'AM'
	}
	timeNode.textContent = ' ' + zero(month) + '/' + zero(day) + '/' + zero(year) + '(' + day_of_week + ')' + zero(hour) + min_sec + ' '
	//timeNode.textContent = ' ' + day_of_week + ' ' + monthShort() + ' ' + day + ', ' + hour + min_sec + ' '

	function last_day_of_month() {
		switch (month) {
			case 1: return 31
			case 2: return (28 + leap)
			case 3: return 31
			case 4: return 30
			case 5: return 31
			case 6: return 30
			case 7: return 31
			case 8: return 31
			case 9: return 30
			case 10: return 31
			case 11: return 30
			case 12: return 31
		}
	}

	function yesterday() {
		switch (day_of_week) {
			case 'Sun' : return 'Sat'
			case 'Mon' : return 'Sun'
			case 'Tue' : return 'Mon'
			case 'Wed' : return 'Tue'
			case 'Thu' : return 'Wed'
			case 'Fri': return 'Thu'
			case 'Sat' : return 'Fri'
		}
	}

	function tomorrow() {
		switch (day_of_week) {
			case 'Sun' : return 'Mon'
			case 'Mon' : return 'Tue'
			case 'Tue' : return 'Wed'
			case 'Wed' : return 'Thu'
			case 'Thu' : return 'Fri'
			case 'Fri': return 'Sat'
			case 'Sat' : return 'Sun'
		}
	}

	function zero(el) {
		if (el < 10)
			el = '0' + el
		return el
	}

	function monthShort() {
		switch (month) {
			case 1: return 'Jan'
			case 2: return 'Feb'
			case 3: return 'Mar'
			case 4: return 'Apr'
			case 5: return 'May'
			case 6: return 'Jun'
			case 7: return 'Jul'
			case 8: return 'Aug'
			case 9: return 'Sep'
			case 10: return 'Oct'
			case 11: return 'Nov'
			case 12: return 'Dec'
		}
	}
}

var form = document.evaluate("./form", document.body, null, 8, null).singleNodeValue
if (form)
	form.addEventListener('DOMNodeInserted',
		function(e) {
			if (e.target.nodeName=='TABLE')
				retime( document.evaluate(xpath, e.target, null, 8, null).singleNodeValue )
		},
		true)
