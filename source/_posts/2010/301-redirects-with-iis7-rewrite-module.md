---
layout: post
date: 2010-03-08
title: 301 Redirects with the IIS7 Rewrite Module
permalink: 301-redirects-with-iis7-rewrite-module
categories:
- Development
tags:
- 301 Redirect
- IIS7
- rewrite module
- change domain
comments: true
---
We all have drilled into us how important it is to use a 301 redirect when changing a website's address so that the site's page rank and other SEO goodies are preserved.  Since it's so important, you'd think it would be easier, or maybe even straightforward to accomplish.

I recently moved this blog from a subdirectory of another domain to its very own domain, and wanted to do just that, and found it anything but easy.

People with Apache webservers have long had the ability to perform 301 redirects in a fairly straightforward manner using .htaccess files.  However, IIS users have not been so lucky.  Although I have a WordPress blog (because it's the best out there) I am an ASP.NET developer and I need to have a Windows server playground to try stuff out in, so I have PHP 5 and .NET 3.5 running on Windows Server 2008.  So .htaccess files aren't an option for me.

At first I tried redirecting purely with PHP inside the bounds of WordPress.  I tried multiple redirection plugins, none of which seemed to work.  They would redirect my site, but when I checked with [Fiddler](http://www.fiddler2.com/fiddler2/) it would always be a 302 redirect.  Unacceptable.

<!-- more -->

I even tried monkeying directly with WordPress's index.php file, which I was not happy about doing because I knew it would make upgrading WordPress more difficult.  Even with the following PHP-based redirect as the first few lines of the PHP file...

    // Note, didn't work for me, provided for reference only
    header( "HTTP/1.1 301 Moved Permanently" );
    header( "Location: http://www.new-url.com" );
    exit();

... I was still getting 302 redirects when checking in Fiddler. I don't know if it's something specifically about the interaction between IIS7 and PHP. Maybe once IIS hands off the ISAPI request to PHP, it won't accept a 301 as a response and so it defaults to a 302. In any case, it didn't work, and I wasn't happy.

Enter the [IIS7 Rewrite Module](http://www.iis.net/expand/URLRewrite).  It's not a standard part of IIS so you need to download and install it separately, but it's beyond worth it.  It enables rewriting urls for pretty, SEO-friendly urls, but it also supports redirection as well.

At first I had trouble with the rewrite module.  I was dealing with raw Web.config files on my hosting provider's site, not having direct access to the IIS controls themselves.  It was also difficult to find documentation on the configuration settings since everywhere you look pretty much assumes you're working with the GUI tools in the IIS7  Manager, which I wasn't. I tried many things, based on examples I found off the Internet or my own guesses and theories, and they all either didn't work or gave me a big fat 500 error.

I finally found some help from [URL Rewrite Module Configuration Reference](http://learn.iis.net/page.aspx/465/url-rewrite-module-configuration-reference/) on [learn.iis.net](http://learn.iis.net), which I feel pretty safe elevating to the status of Must Read. After some more guess-and-check, I came up with the following configuration for redirecting a site hosted in a subdirectory to its own top-level primary domain:

```
<!-- Web.config file in subdirectory to be redirected -->
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="RedirectRule" stopProcessing="true">
          <match url="(.*)" ignoreCase="true" />
          <action type="Redirect" url="http://www.newdomain.com/{R:1}" redirectType="Permanent" />
            <conditions>
                <add input="{HTTP_HOST}" pattern="www\.old-domain\.com" />
            </conditions>
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

Here are some of the things that threw me for a loop:

-   **The match url is relative to the location of the web.config file.** I've written a regular expression or two in my day, and I thought I was matching against the entire path. If the Web.config file is at `/old/app/path/web.config`, and you are trying to redirect `/old/app/path/default.aspx`, then the string you are matching against in this context is "default.aspx" without any sort of beginning slash. Therefore, the match url of `(.*)` matches everything in the subdirectory.
-   **{R:1} looks way too similar to .NET string formatting jargon**. In reality it has much more in common with regular expression replacement syntax. `{R:1}` means the first captured group within the regular expression (or wildcard matched \* if that's the way you want to go.) Likewise, `{R:0}` is the entire matched string. From what I read, `{C:1}` would be the first captured group within a condition regular expression (as opposed to the **R** for Match **R**ule, perhaps, although the letter R doesn't occur anywhere near to the regular expression it matches. Whatever. In any case, I haven't had the opportunity to utilize a C match yet.
-   **Rule operates on the path and query; use conditions for domains.** Or for anything else that isn't the path, for that matter. In my case, I have one hosting account where I can post secondary domains (like this one) to a subdomain as its root. That means I need to filter for the old domains - it wouldn't do to have the new domain redirect to itself. Rumor has it that infinite redirects are bad.
-   **Try different things with the GUI in IIS7 Manager.** While I didn't find my exact answer, I learned a lot by trying different things and seeing how they were represented in the Web.config file.
-   **Can I please get a list of condition variables?** I haven't been able to find a comprehensive list of variables that can be used between curly braces, but they correspond to server variables. In fact, any HTTP header can be used if you format it all uppercase, convert any dashes to underscores, and prefix it with "HTTP\_". More useful information, including even string functions, can be found by reading [URL Rewrite Module Configuration Reference](http://learn.iis.net/page.aspx/465/url-rewrite-module-configuration-reference/) at length. It's worth it.
-   **If using WordPress (or other web application that can rewrite local files), make sure the Web.config file isn't writeable.** WordPress might see that the file isn't exactly like it thinks it should be to do its own url rewriting and try to replace it under your nose. Well, not under your nose, but you might push a button that overwrites it without thinking about it, and it will probably be months before you figure out that it even happened, much less that it destroyed your page rank.
