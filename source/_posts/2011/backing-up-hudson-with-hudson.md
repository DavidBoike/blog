---
layout: post
date: 2011-07-09
title: Backing up Hudson, with Hudson
permalink: backing-up-hudson-with-hudson
categories:
- Development
tags:
- Fog Creek
- kiln
- Mercurial
- continuous integration
- Hudson
- backup
- build server
comments: true
---
At work we use Hudson Continuous Integration for our build servers because, among other reasons:

-   It's **FREE!**
-   It runs on Windows (for our C\# builds) and on Mac/Linux (for our iOS/Android builds).
-   It has a web-based GUI that is MUCH easier to use than the XML-driven config used by [CruiseControl.NET](http://sourceforge.net/projects/ccnet/), which we used before switching to Hudson.
-   It has a rich system of plugins for adding functionality.
-   Did I mention it's **FREE?**

The one nice thing about CruiseControl.NET was that because it had one complex XML configuration file, I would only edit that file in source control so that I could back out my changes if I screwed it up. Now I need a way to back up the Hudson configuration files so that if one of my build servers goes up in flames, I can get my team back in business quickly.

A good backup solution needs to be automatic and offsite, and due to the magic of distributed version control and the inherent job execution nature of Hudson, we can back up Hudson *with Hudson*. If this isn't the ultimate in universe folding in on itself awesome, I don't know what is.

<!-- more -->

To get your own backup started:

1.  Get an offsite [Mercurial](http://hginit.com/) repository that you can push to over the Internet using the credentials that your Hudson server runs under. We use (and I heavily recommend) [Kiln](http://www.fogcreek.com/kiln/) from [Fog Creek Software](http://www.fogcreek.com/), which combines hosted Mercurial source control with killer code review tools and a host of other power tools, such as a code search facility that I now could not live without. Check it out - it will change your life.
2.  Make sure you have Hudson's Mercurial plugin installed.
3.  Create a new Hudson project named "Hudson Backup" or something similar.
4.  Under Source Code Management, enter your Mercurial repository URL. Unlike a normal project where you pull code from a repository and then build it, we will instead be pushing backups to this repository, but defining it here identifies it as Hudson's workspace.
5.  Under Build Triggers, check "Build Periodically" and in the Schedule textbox, enter "@hourly". This will run the backup job every hour, but will only push new changes to your Mercurial repository when there are changes (when you've modified something in the Web UI).
6.  Under Build, add a new build step of type "Execute Windows batch command". The script follows:

<!-- -->

    :: Copy the main Hudson config file
    copy "%BASE%\config.xml" "%WORKSPACE%\config.xml"
    :: Copy each job's config file
    for /f "delims=|" %%f in ('dir /b %BASE%\jobs') do (
    mkdir "%WORKSPACE%\jobs\%%f"
    copy "%BASE%\jobs\%%f\config.xml" "%WORKSPACE%\jobs\%%f\config.xml" /Y
    )
    :: If there are changes, commit them to local repository then push
    hg commit --addremove --message "Backing up changes to Hudson configuration."
    hg push

Now, the job will run every hour, and if there are any changes, they will be committed and pushed to your remote Mercurial repository. *Even your backup job is backed up by your backup job!*

If you were to ever lose your build server, you could set up a new Hudson server, clone your Mercurial repository locally, copy the backup config files to your Hudson directory, and then execute the Reload Configuration from Disk command in Hudson, and you're back in business.
