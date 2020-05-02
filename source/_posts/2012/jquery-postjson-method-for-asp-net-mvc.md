---
layout: post
date: 2012-11-07
title: jQuery.postJSON() method for ASP.NET MVC
permalink: jquery-postjson-method-for-asp-net-mvc
categories:
- Development
tags:
- source code
- MVC
- jQuery
- JavaScript
- AJAX
- JSON
comments: true
---
Part of the reason I blog is that it serves as a healthy reminder for me of the best ways I've found to do things. The Internet is full of information that's just plain wrong, or only wrong in certain scenarios that don't always match mine.

So when I have to grapple with the exact same stupid problem for the second time, it's obviously time to record it, if only for the sanity of Future Me. Today's example is posting JSON to an ASP.NET MVC action method.

<!-- more -->

There are a bunch of examples all over the Internet that will tell you to do this:

    // THIS IS WRONG!
    // Well.....at least for MVC.
    $.post('/some/url', data, function(response) {
        // Do something with the request
    }, 'json');

This is all well and good and does cause jQuery to submit data encoded as JSON instead of URL-encoded, the problem comes in on the MVC side. This request results in this offending header:

    Content-Type: json; charset=UTF-8

Um, that's not right! "json" is not a valid MIME type! Because of this, even though the payload *is* JSON, MVC will not deserialize it properly and so any of your action method parameters will be null. Even worse, if you have a non-nullable parameter (an int, for example) then you will get an exception from the model binder.

So this snippet creates the simple postJSON method that jQuery on its own is missing, nicely wrapped within a closure so that it can operate in jQuery's noConflict mode:

    (function ($) {
        $.postJSON = function (url, data) {
            var o = {
                url: url,
                type: "POST",
                dataType: "json",
                contentType: 'application/json; charset=utf-8'
            };
            if (data !== undefined) {
                o.data = JSON.stringify(data);
            }
            return $.ajax(o);
        };
    } (jQuery));

This will correctly set the Content-Type header so that MVC can understand it. The function returns a jqXHR object that implements the [Promise interface](http://api.jquery.com/category/deferred-object/) so that you can chain your event handlers on to the end like this:

    $.postJSON('/post/url', {param1: "hello", param2: "world"})
        .complete(function () {
            // Optional - fires when the operation completes, regardless of status
        })
        .success(function () {
            // Optional - fires when operation completes successfully
        })
        .error(function () {
            // Optional - fires when operation completes with error
        });

Enjoy, Future Me!
