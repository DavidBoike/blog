---
layout: post
date: 2015-05-21
title: Goodbye WordPress, Hello Jekyll
permalink: goodbye-wordpress-hello-jekyll
comments: true
categories:
- Announcements
tags:
- Jekyll
- GitHub
- GitHub Pages
- WordPress
---

WordPress and I had an altercation the other day.

I logged in to the management interface for my blog, and it was begging me to update to WordPress 4.2.2, and given the [number of security vulnerabilities](http://www.cvedetails.com/vulnerability-list/vendor_id-2337/product_id-4096/) that have been in the news lately, I figured that was probably a good idea.

But this time, the automated, one-click update process failed me for the first time. I don't know precisely why, but it blew up mid-stream. Luckily the public portion of the site was still serving, but the admin was completely roasted. So I had to go through the painful process of doing a manual upgrade over FTP.

Luckily, I got everything working on Version 4.2.2, but I resolved at that point that 4.2.2 would be my last.

It's not that I'm a huge WordPress hater. When it works it works well enough. But I absolutely disdain PHP, kind of like [this guy](http://eev.ee/blog/2012/04/09/php-a-fractal-of-bad-design/), so I can't really go hack on it very well because to do so would give me the itchies all over. The freedom I want to have with my blog makes WordPress.com hosting impossible, but I don't want to go through the hassle of self-hosting either. Plus I really *really* want to the particular webhost I'm using [because](http://gawker.com/5787676/meet-godaddys-ridiculous-elephant-killing-ceo) [reasons](http://breakupwithgodaddy.com/), and moving my blog is a great first step.

I recently joined [Particular Software](http://particular.net) and we do everything on [GitHub](https://github.com). No really, I mean *everything*. (Well OK, GitHub and [Slack](https://slack.com/).) And while I'm no slouch at HTML when I really want to write, nothing beats Markdown. So it makes sense to take advantage of that.

So, if you're reading this post, my blog is now run by [Jekyll](http://jekyllrb.com/) on [GitHub Pages](https://pages.github.com/). How does that work? Glad you asked.

1. Create a new GitHub repository called *your-github-username*.github.io - mine is [davidboike.github.io](https://github.com/DavidBoike/davidboike.github.io).
2. Create a Jekyll repository. (This is the tricky part.)
3. Write your posts as Markdown files.
4. Push your changes to GitHub.
5. GitHub compiles your posts from your master branch into HTML pages serves it up as static content.

Rather than do a whole bunch of work on #2, I decided to stand on the shoulders of [Phil Haack](http://haacked.com) whose [blog post on converting his own blog](http://haacked.com/archive/2013/12/02/dr-jekyll-and-mr-haack/) had originally informed me Jekyll, and ~~take inspiration from~~ outright steal his Jekyll repository as a starting point. Luckily, [he's OK with that](https://github.com/Haacked/feedback/issues/69). I did make some changes to make it my own.

The trickiest part turned out to be porting my content. There is a [WordPress to Jekyll converter](http://import.jekyllrb.com/docs/wordpress/) but it goes pretty crazy on you, and doesn't convert the WordPress HTML to Markdown. So I had to do a lot of work on my own to [convert the HTML to Markdown with Pandoc](http://stackoverflow.com/questions/6119793/convert-html-or-rtf-to-markdown-or-wiki-compatible-syntax) and then clean up a lot of the mess afterwards.

But it's definitely worth it. Now I don't have to worry if my blog is down. That's GitHub's problem. I can edit my posts with Markdown using the same GitHub workflow I use every day. And it means I can accept pull requests on my blog! So if I make a mistake, please speak up and correct me!

Hopefully this will make it even easier for me to blog in the future.
