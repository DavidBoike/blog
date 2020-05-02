---
layout: post
date: 2010-02-23
title: How not to redirect to a mobile website
permalink: how-not-to-redirect-to-a-mobile-website
categories:
- Development
tags:
- usability
- mobile site
comments: true
---
A friend of mine posted a political link on [Facebook](http://www.facebook.com) to an article on [Salon.com](http://www.salon.com), who have a perfect implementation of how **not**to redirect to a mobile website.

I was using the Facebook app on my iPhone, so the redirect to a mobile site wasn't unexpected.  However, when I arrived, the page had navigation and no story content.  I assumed I had reached the homepage (root) of the mobile site.  This is not helpful.  The page had a link to the full version of the site, but of course that went to the full site's homepage.  I should not have to go to the full site and then search around to find the content that I was given a deep link for!

When I got back to a real computer, I found out that it was actually much worse.  Using an iPhone UserAgent in Firefox, the Facebook link redirected to the exact same path, but on mobile.salon.com instead of www.salon.com.

The problem was that the directory structure on the two sites was not the same.  Redirecting to the same path could not hope to succeed because the same path didn't exist on the mobile site, so all I got was navigation, leading me to believe that I'd been redirected to the mobile homepage.

So here are my thoughts on how to redirect to a mobile site without making your users leave quickly:

-   Keep the directory structures exactly the same between mobile and full versions of your site.  If you can serve both sites with the same plumbing, then all the better.  To give an ASP.NET example, use the same ASPX pages, but change the MasterPageFile during OnPreInit to switch out the template for a simpler version on your mobile site.
-   Include a link to the Full Version in your footer, but make sure that it's to the full version of the same mobile page currently being viewed.
-   Set a session cookie to keep the user anchored to the full site if that's where they've told you they want to be.

Always keep usability foremost in mind.  90% of people won't go as far to read your content as I did.

**Update March 7, 2011:**

A year after I wrote this blog post, [XKCD](http://www.xkcd.com/) expressed the entirety of my thoughts in simple comic form:

[![XKCD: Server Attention Span - Licensed under Creative Commons Attribution-NonCommercial 2.5](/images/server_attention_span.png)](http://xkcd.com/869/)
