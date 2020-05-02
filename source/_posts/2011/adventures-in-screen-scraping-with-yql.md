---
layout: post
date: 2011-07-05
title: Adventures in Screen Scraping with YQL
permalink: adventures-in-screen-scraping-with-yql
categories:
- Development
tags:
- jQuery
- YQL
- screen scraping
- Google Maps API
- mapping
comments: true
---
When coding for work, everything of course has to be done the Right Way®. This isn't always super exciting, so it is sometimes liberating to cut loose and work on a side project that mashes together a whole bunch of technologies without worrying too much about stability, reliability, scalability, *or even if it will continue to run tomorrow.* These R&D projects will never have even a single line of code directly pushed into even a development repository, but more often than not I find that I take concepts learned and tested during these coding sessions and apply them in some later project. Even if the entire project is thrown away in relatively short order, some concept of value survives for the long haul.

Plus, it's just fun.

Recently my wife and I got the very exciting (and scary!) news that we were pregnant with our first child. The little guy or girl's arrival is still over 5 months away, but already we're wrestling with tons of difficult questions, and one particularly overwhelming one is "How are we going to decide where to send our child for day care?"

We live in the great state of Minnesota where the Department of Human Services maintains a searchable [Licensing Info Lookup](http://licensinglookup.dhs.state.mn.us/) website for all sorts of things, including (but not limited to) family child care. Anyone with a child care license can be found here, along with address, phone number, if they can accept newborn infants and how many, etc.

Just one problem. We live on the border of two big suburbs, so you do a search for both cities and together you get over 150 results, and **no map**.

This is where my inner geek starts to get excited. I've got a copy of Visual Studio. I can fix this problem. Let's do it.

<!-- more -->

### Screen Scraping with YQL

Of course it's not possible for a web page to directly access data from a different domain, but using a proxy capable of JSONP, it's possible to grab data from any website, format it into JSON, and then surround it with a callback parameter so that you can inject it as a script tag into your document's HEAD, where it will execute your callback function by passing the data inside. If you're not familiar with this, check out [Wikipedia's JSONP page](http://en.wikipedia.org/wiki/JSONP).

It turns out that [YQL (Yahoo! Query Language)](http://developer.yahoo.com/yql/) can serve as the perfect proxy in this situation. In a real-life project, I would be hesitant to rely on YQL as Yahoo could begin to reject an application for high traffic, or just pull the plug on YQL altogether. But for a low traffic site (hit by only myself and my wife) it's a perfect match.

First you need to analyze the page you wish to scrape. On each of the two search result pages (one for each city) I wished to scrape, the HTML content for each search result looked something like this, where I've replaced any real content with {Placeholders}.


    {ResultName}
    Active
        


    {StreetAddress}{CityStateZip}
            {PhoneNumber}
            {CountyName}
    License number: {LicenseNumber}
            Type of service: Family Child Care
        
        

Really, Minnesota? Table-driven design? Ever heard of semantic markup? But I digress. As much as I detest this markup (I would instantly reject it if I saw it in a code review from my own developers) it has enough detail that I can work with this.

The YQL expression goes like this:

    select * from html
    where url = "{Url}"
        and xpath='//table[@class="LicTable1" or @class="LicTable"]'

YQL can fetch the original HTML, perform an xpath to locate any table node with the class name "LicTable1" or "LicTable" and then return those results. To try it for yourself, head over to the [Minnesota Department of Human Services Licensing Lookup](http://licensinglookup.dhs.state.mn.us/), perform any search you like, drop the search results URL into the format above, and then drop that into the [YQL Console](http://developer.yahoo.com/yql/console/). If it doesn't work anymore, it's probably because the MN-DHS changed the markup on the website. That's what you get when you try to screen scrape - nobody is under any obligation to adhere to any sort of contract in their HTML markup.

You'll find that YQL can return its results in XML or in JSON, where in JSON the HTML markup is converted into JSON objects. If you implement the callback function (the YQL Console uses "cbfunc" by default, I'm using \$.parseData) you can parse through the HTML structure shown above like this:

    var data = { List: [] };
    $.parseData = function (d) {
        var cur = null;
        $(d.query.results.table).each(function (i, tbl) {
            if (tbl.class == "LicTable1") {
                cur = {
                    name: tbl.tr.td[0].a.content,
                    href: "http://licensinglookup.dhs.state.mn.us/" + tbl.tr.td[0].a.href,
                    enabled: true
                };
            }
            else if (tbl.class == "LicTable" && cur != null) {
                var lines = tbl.tr.td[0].p.content.split('\n');
                cur.address1 = $.trim(lines[0]);
                cur.address2 = $.trim(lines[1]);
                cur.phone = $.trim(lines[2]);
                data.List.push(cur);
                cur = null;
            }
        });
    };

Now I've got all my data added to a JSON data model on the client side. With this in hand, it became pretty straightforward to:

-   Transfer the data to a server-side data model with an ASP.NET Script Service.
-   Persist the data to a flat file with XML Serialization.
-   Geocode the addresses to latitude/longitude pairs with the [Google Maps API](http://code.google.com/apis/maps/documentation/javascript/).
-   Display a pin for each location on a map, along with a detail pane, where clicking on the pin or the left-side summary would highlight the other.
-   Add a textarea to the left-side summary so that we can take down notes when we call each daycare location, then save that data server-side as well.

The possibilities for extension are endless, but with this level of sophistication, my wife and I were able to pick out several home day cares that are located conveniently close to the route of our commute, and start with that list when making our calls.

Of course as it turns out, we are grossly ahead of schedule, and most calls resulted in being told we were calling way too early.

But as a software developer, I'll never object to being called ahead of schedule.
